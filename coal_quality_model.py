"""
Coal Quality Estimation - ML pipeline
Predicts Gross Calorific Value (GCV, kcal/kg) and the Indian non-coking
coal grade (G1-G17) from proximate analysis: Moisture, Ash, Volatile
Matter, Fixed Carbon (FC = 100 - M - A - VM).

GCV target is generated from the published Parikh, Channiwala & Ghosal
(2005) correlation for solid fuels with added lab noise, so the models
must LEARN the relationship. Replace generate_dataset() with a real lab
CSV (same columns) to train on actual coal data.
"""
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

RNG = np.random.default_rng(42)
MJ_TO_KCAL = 238.846

GRADE_BANDS = [
    ("G1", 7001), ("G2", 6701), ("G3", 6401), ("G4", 6101), ("G5", 5801),
    ("G6", 5501), ("G7", 5201), ("G8", 4901), ("G9", 4601), ("G10", 4301),
    ("G11", 4001), ("G12", 3701), ("G13", 3401), ("G14", 3101), ("G15", 2801),
    ("G16", 2501), ("G17", 2201),
]

def assign_grade(gcv):
    for grade, low in GRADE_BANDS:
        if gcv >= low:
            return grade
    return "Below G17"

def parikh_hhv_mj(fc, vm, ash):
    return 0.3536 * fc + 0.1559 * vm - 0.0078 * ash

def generate_dataset(n=4000):
    rows = []
    while len(rows) < n:
        M = RNG.uniform(2, 18)
        A = RNG.uniform(8, 50)
        VM = RNG.uniform(15, 38)
        FC = 100 - M - A - VM
        if FC < 8 or FC > 70:
            continue
        dry = 100 - M
        fc_d, vm_d, a_d = FC / dry * 100, VM / dry * 100, A / dry * 100
        hhv_dry = parikh_hhv_mj(fc_d, vm_d, a_d)
        hhv_ar = hhv_dry * dry / 100
        gcv = hhv_ar * MJ_TO_KCAL + RNG.normal(0, 90)
        rows.append((M, A, VM, FC, gcv))
    df = pd.DataFrame(rows, columns=["Moisture", "Ash", "VolatileMatter",
                                     "FixedCarbon", "GCV_kcal_kg"])
    df["Grade"] = df["GCV_kcal_kg"].apply(assign_grade)
    return df

def main():
    df = generate_dataset()
    df.to_csv("coal_dataset.csv", index=False)
    print(f"Dataset: {len(df)} samples -> coal_dataset.csv")

    X = df[["Moisture", "Ash", "VolatileMatter", "FixedCarbon"]].values
    y = df["GCV_kcal_kg"].values
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

    models = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1),
        "GradientBoosting": GradientBoostingRegressor(random_state=42),
    }
    metrics, fitted = {}, {}
    for name, m in models.items():
        m.fit(Xtr, ytr)
        pred = m.predict(Xte)
        metrics[name] = {
            "R2": round(float(r2_score(yte, pred)), 4),
            "MAE_kcal": round(float(mean_absolute_error(yte, pred)), 1),
            "RMSE_kcal": round(float(np.sqrt(mean_squared_error(yte, pred))), 1),
        }
        fitted[name] = m
        print(f"{name:18s} R2={metrics[name]['R2']:.4f}  MAE={metrics[name]['MAE_kcal']}  RMSE={metrics[name]['RMSE_kcal']}")

    best_name = max(metrics, key=lambda k: metrics[k]["R2"])
    best = fitted[best_name]
    gp = [assign_grade(v) for v in best.predict(Xte)]
    gt = [assign_grade(v) for v in yte]
    exact = np.mean([p == t for p, t in zip(gp, gt)])
    within1 = np.mean([abs(int(p[1:]) - int(t[1:])) <= 1 for p, t in zip(gp, gt)
                       if p[0] == "G" and t[0] == "G"])
    metrics["_grade_accuracy"] = {"best_model": best_name,
                                  "exact_grade": round(float(exact), 4),
                                  "within_1_grade": round(float(within1), 4)}
    print(f"\nBest: {best_name} | exact grade {exact:.1%} | within +/-1 grade {within1:.1%}")

    joblib.dump(best, "coal_gcv_model.joblib")
    with open("metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    lin = fitted["LinearRegression"]
    coeffs = {
        "features": ["Moisture", "Ash", "VolatileMatter", "FixedCarbon"],
        "coefficients": [round(float(c), 4) for c in lin.coef_],
        "intercept": round(float(lin.intercept_), 4),
        "linear_R2": metrics["LinearRegression"]["R2"],
        "rf_R2": metrics["RandomForest"]["R2"],
    }
    with open("model_coefficients.json", "w") as f:
        json.dump(coeffs, f, indent=2)
    print("Exported linear coefficients -> model_coefficients.json")

    pred = best.predict(Xte)
    plt.figure(figsize=(6, 6))
    plt.scatter(yte, pred, s=8, alpha=0.4, color="#C9A227")
    lo, hi = min(yte.min(), pred.min()), max(yte.max(), pred.max())
    plt.plot([lo, hi], [lo, hi], "k--", lw=1)
    plt.xlabel("Actual GCV (kcal/kg)"); plt.ylabel("Predicted GCV (kcal/kg)")
    plt.title(f"{best_name}: Predicted vs Actual (R2={metrics[best_name]['R2']})")
    plt.tight_layout(); plt.savefig("pred_vs_actual.png", dpi=110)

    imp = fitted["RandomForest"].feature_importances_
    feats = ["Moisture", "Ash", "VolatileMatter", "FixedCarbon"]
    order = np.argsort(imp)
    plt.figure(figsize=(6, 4))
    plt.barh([feats[i] for i in order], imp[order], color="#1f3a5f")
    plt.xlabel("Importance"); plt.title("What drives calorific value (RandomForest)")
    plt.tight_layout(); plt.savefig("feature_importance.png", dpi=110)
    print("Saved plots.")

if __name__ == "__main__":
    main()
