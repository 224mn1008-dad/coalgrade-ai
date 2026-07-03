
// ---- trained linear model (exported from scikit-learn) ----
const COEF = {Moisture:-29.3574, Ash:-32.0216, VolatileMatter:7.0669, FixedCarbon:54.3122};
const INTERCEPT = 3007.0344;
const BANDS = [["G1",7001],["G2",6701],["G3",6401],["G4",6101],["G5",5801],
  ["G6",5501],["G7",5201],["G8",4901],["G9",4601],["G10",4301],["G11",4001],
  ["G12",3701],["G13",3401],["G14",3101],["G15",2801],["G16",2501],["G17",2201]];

function predictGCV(m,a,v,fc){return COEF.Moisture*m+COEF.Ash*a+COEF.VolatileMatter*v+COEF.FixedCarbon*fc+INTERCEPT;}
function grade(g){for(const[name,low] of BANDS){if(g>=low)return name;}return "Below G17";}
function gradeColor(g){const n=g.startsWith("G")?parseInt(g.slice(1)):18;
  if(n<=5)return "#2e7d51"; if(n<=10)return "#5a9e4a"; if(n<=13)return "#c98a27"; return "#b4453a";}
function quality(g){const n=g.startsWith("G")?parseInt(g.slice(1)):18;
  if(n<=4)return "Premium / high-grade thermal coal";
  if(n<=8)return "Good thermal coal — strong power-station feed";
  if(n<=12)return "Medium grade — typical Indian non-coking coal";
  if(n<=15)return "Low grade — high ash, lower heat value";
  return "Very low grade — limited calorific value";}

// ---- single sample (live) ----
const ids=["m","a","v"];
function getVals(){return {m:+m.value,a:+a.value,v:+v.value};}
function sync(slider,num){slider.addEventListener("input",()=>{num.value=slider.value;update();});
  num.addEventListener("input",()=>{slider.value=num.value;update();});}
sync(m,mn);sync(a,an);sync(v,vn);

function update(){
  const {m:M,a:A,v:V}=getVals();
  mv.textContent=M.toFixed(1);av.textContent=A.toFixed(1);vv.textContent=V.toFixed(1);
  const FC=100-M-A-V;
  fc.textContent=FC.toFixed(1)+" %";
  if(FC<0){warn.textContent="⚠ Moisture + Ash + VM exceed 100%. Adjust inputs.";gcv.textContent="—";badge.textContent="—";badge.style.background="#aaa";desc.textContent="";return;}
  if(FC<5){warn.textContent="⚠ Very low fixed carbon — check values.";}else{warn.textContent="";}
  const g=predictGCV(M,A,V,FC);
  const gr=grade(g);
  gcv.textContent=Math.round(g).toLocaleString();
  badge.textContent=gr;badge.style.background=gradeColor(gr);
  desc.textContent=quality(gr);
  const pct=Math.max(0,Math.min(100,(g-2200)/(7200-2200)*100));
  marker.style.left=pct+"%";
}
update();

// ---- batch CSV ----
let lastResults=[];
function parseCSV(text){
  const lines=text.trim().split(/\r?\n/);
  const head=lines[0].split(",").map(h=>h.trim().toLowerCase());
  const idx=n=>head.findIndex(h=>h.replace(/[_\s]/g,"").includes(n));
  const im=idx("moisture"),ia=idx("ash"),iv=idx("volatile"),ifc=idx("fixedcarbon");
  const out=[];
  for(let i=1;i<lines.length;i++){
    if(!lines[i].trim())continue;
    const c=lines[i].split(",");
    const M=+c[im],A=+c[ia],V=+c[iv];
    let FC = ifc>=0 && c[ifc]!==undefined && c[ifc]!=="" ? +c[ifc] : 100-M-A-V;
    if([M,A,V,FC].some(x=>isNaN(x)))continue;
    const g=predictGCV(M,A,V,FC),gr=grade(g);
    out.push({M,A,V,FC,g:Math.round(g),gr});
  }
  return out;
}
function renderTable(rows){
  if(!rows.length){tableWrap.innerHTML="<p class='warn'>No valid rows found. Check column names.</p>";return;}
  let h="<table><thead><tr><th>#</th><th>Moisture</th><th>Ash</th><th>VM</th><th>Fixed C</th><th>GCV kcal/kg</th><th>Grade</th></tr></thead><tbody>";
  rows.forEach((r,i)=>{h+=`<tr><td>${i+1}</td><td>${r.M.toFixed(1)}</td><td>${r.A.toFixed(1)}</td><td>${r.V.toFixed(1)}</td><td>${r.FC.toFixed(1)}</td><td><b>${r.g.toLocaleString()}</b></td><td><span class="gpill" style="background:${gradeColor(r.gr)}">${r.gr}</span></td></tr>`;});
  h+="</tbody></table>";tableWrap.innerHTML=h;
}
csv.addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=ev=>{lastResults=parseCSV(ev.target.result);renderTable(lastResults);dl.style.display=lastResults.length?"inline-block":"none";};
  rd.readAsText(f);
});
dl.addEventListener("click",()=>{
  let csvOut="Moisture,Ash,VolatileMatter,FixedCarbon,GCV_kcal_kg,Grade\n";
  lastResults.forEach(r=>csvOut+=`${r.M.toFixed(1)},${r.A.toFixed(1)},${r.V.toFixed(1)},${r.FC.toFixed(1)},${r.g},${r.gr}\n`);
  const b=new Blob([csvOut],{type:"text/csv"});const u=URL.createObjectURL(b);
  const a=document.createElement("a");a.href=u;a.download="coalgrade_results.csv";a.click();URL.revokeObjectURL(u);
});
sample.addEventListener("click",()=>{
  const s="Moisture,Ash,VolatileMatter\n6.5,18.0,30.0\n10.2,35.5,24.0\n4.0,12.0,33.5\n14.0,45.0,20.0\n7.5,22.0,28.5\n";
  const b=new Blob([s],{type:"text/csv"});const u=URL.createObjectURL(b);
  const a=document.createElement("a");a.href=u;a.download="sample_coal.csv";a.click();URL.revokeObjectURL(u);
});

// ---- real Coal India benchmark (official, data.gov.in) ----
const BENCH=[
  {code:"CIL",name:"Coal India Ltd (overall)",gcv:4198,grade:"G11"},
  {code:"NEC",name:"North Eastern Coalfields",gcv:6625,grade:"G3"},
  {code:"BCCL",name:"Bharat Coking Coal",gcv:5205,grade:"G7"},
  {code:"ECL",name:"Eastern Coalfields",gcv:5339,grade:"G7"},
  {code:"NCL",name:"Northern Coalfields",gcv:4692,grade:"G9"},
  {code:"WCL",name:"Western Coalfields",gcv:4253,grade:"G11"},
  {code:"CCL",name:"Central Coalfields",gcv:4218,grade:"G11"},
  {code:"SECL",name:"South Eastern Coalfields",gcv:4196,grade:"G11"},
  {code:"SCCL",name:"Singareni Collieries",gcv:4085,grade:"G11"},
  {code:"MCL",name:"Mahanadi Coalfields",gcv:3530,grade:"G13"}
];
function renderBench(){
  let h="<table><thead><tr><th>Subsidiary</th><th>Avg GCV (kcal/kg)</th><th>Grade</th></tr></thead><tbody>";
  BENCH.forEach(b=>{h+=`<tr><td>${b.name} (${b.code})</td><td><b>${b.gcv.toLocaleString()}</b></td><td><span class="gpill" style="background:${gradeColor(b.grade)}">${b.grade}</span></td></tr>`;});
  h+="</tbody></table>";
  document.getElementById("benchTable").innerHTML=h;
}
renderBench();
