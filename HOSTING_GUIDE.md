# Publish CoalGrade AI free on GitHub Pages

Goal: turn `index.html` into a **public clickable link** you can paste on LinkedIn,
e.g. `https://yourname.github.io/coalgrade-ai/`. Free, no server, ~10 minutes.

## What you need
- A free **GitHub account** (sign up at github.com if you don't have one)
- The file **`index.html`** (that's the whole app — it's self-contained)

---

## Step 1 — Create a repository
1. Go to **github.com**, sign in.
2. Click the **+** (top-right) → **New repository**.
3. Repository name: **`coalgrade-ai`**
4. Set it to **Public**.
5. Tick **"Add a README file"**.
6. Click **Create repository**.

## Step 2 — Upload the app
1. In your new repo, click **Add file** → **Upload files**.
2. Drag in **`index.html`**. (Optional: also upload `README.md`,
   `CoalGrade_AI_poster.png`, `coal_india_gcv_official.csv` for completeness.)
3. Scroll down, click **Commit changes**.

## Step 3 — Turn on GitHub Pages
1. In the repo, click **Settings** (top menu).
2. Left sidebar → **Pages**.
3. Under **"Branch"**, select **`main`** and folder **`/ (root)`**.
4. Click **Save**.
5. Wait ~1–2 minutes. The page will show your live URL at the top:
   **`https://<your-username>.github.io/coalgrade-ai/`**

## Step 4 — Test & share
1. Open that URL on your phone and laptop — the app should load and work.
2. That link is what you paste into your LinkedIn post.

---

## Notes
- **Updating later:** just upload a new `index.html` (Add file → Upload → Commit).
  The live site refreshes in a minute or two.
- **Custom name:** the repo name becomes part of the URL. Want
  `.../coal-quality/`? Name the repo that instead.
- **Everything runs in the visitor's browser** — no backend, no cost, no data
  collected. Safe to share widely.
- **Alternative (even simpler):** Netlify Drop (app.netlify.com/drop) — drag the
  file onto the page and it gives you a link instantly, no account needed for a
  quick test. GitHub Pages is better for a permanent, editable home.
