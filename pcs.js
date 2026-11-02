/* ═══════════════════════════════════════════
   EMS — pcs.js
   PCS DASHBOARD (table: PCS_Data)
   Needs: script.js (db, CHART_DEFAULTS), Chart.js
═══════════════════════════════════════════ */

const PCS_CFG = {
  table: "PCS_Data",
  ratedKw: 100,      // PCS rated power (kW) — used for Load gauge
  staleSec: 60,      // no new row for this long => "No recent data"
  limit: 200         // rows fetched per refresh
};

/* key, label, unit, color, decimals  — edit keys to match your columns */
const PCS_FIELDS = [
  ["Active_power",   "Active Power",   "kW",   "#FF924C", 1],
  ["Reactive_power", "Reactive Power", "kVAr", "#8A6FDF", 1],
  ["Ac_voltage",     "AC Voltage",     "V",    "#D75B5B", 1],
  ["Ac_current",     "AC Current",     "A",    "#3B82F6", 1],
  ["Frequency",      "Frequency",      "Hz",   "#E0A25B", 2],
  ["Power_factor",   "Power Factor",   "",     "#14B8A6", 2],
  ["Dc_voltage",     "DC Voltage",     "V",    "#3FB950", 1],
  ["Dc_current",     "DC Current",     "A",    "#E57A2A", 1],
  ["Temperature",    "Temperature",    "°C",   "#D75B5B", 1],
  ["Efficiency",     "Efficiency",     "%",    "#6B8E23", 1]
];

/* Edit per PCS manual */
const PCS_FAULTS = {
  0: "No fault",
  1: "DC over-voltage",
  2: "DC under-voltage",
  3: "Grid over-voltage",
  4: "Grid under-voltage",
  5: "Over-frequency",
  6: "Under-frequency",
  7: "Over-temperature",
  8: "Over-current"
};

const PCS_GROUPS = {
  "Power":        ["Active_power", "Reactive_power"],
  "Voltage":      ["Ac_voltage", "Dc_voltage"],
  "Current":      ["Ac_current", "Dc_current"],
  "Frequency":    ["Frequency"],
  "Power Factor": ["Power_factor"],
  "Temperature":  ["Temperature"],
  "Efficiency":   ["Efficiency"]
};

const FIELD = Object.fromEntries(
  PCS_FIELDS.map(f => [f[0], { key: f[0], label: f[1], unit: f[2], color: f[3], dp: f[4] }])
);

const KPI_DEFS = [
  { k: "Active_power",   label: "Active Power",   unit: "kW", color: "#FF924C", icon: "⚙", dp: 1 },
  { k: "Reactive_power", label: "Reactive Power", unit: "kVAr", color: "#8A6FDF", icon: "∿", dp: 1 },
  { k: "Ac_current",     label: "AC Current",     unit: "A",  color: "#3B82F6", icon: "▬", dp: 1 },
  { k: "Dc_voltage",     label: "DC Voltage",     unit: "V",  color: "#3FB950", icon: "🔋", dp: 1 },
  { k: "Dc_current",     label: "DC Current",     unit: "A",  color: "#E57A2A", icon: "▬", dp: 1 },
  {
    k: "DC_power", label: "DC Power", unit: "kW", color: "#14B8A6", icon: "⚡", dp: 1,
    get: r => {
      const a = pcsNum(r.Dc_voltage), b = pcsNum(r.Dc_current);
      return a == null || b == null ? null : a * b / 1000;
    }
  }
];

const ZC = ["#3FB950", "#E0A25B", "#D75B5B"];

const GAUGES = [
  { id: "vac",  label: "AC Voltage",   unit: "V",  min: 180, max: 260, dp: 1, get: r => pcsNum(r.Ac_voltage),   zone: v => pcsZone(v, 207, 253, 195, 265) },
  { id: "freq", label: "Frequency",    unit: "Hz", min: 47,  max: 53,  dp: 2, get: r => pcsNum(r.Frequency),    zone: v => pcsZone(v, 49.5, 50.5, 49, 51) },
  { id: "pf",   label: "Power Factor", unit: "",   min: 0,   max: 1,   dp: 2, get: r => pcsNum(r.Power_factor), zone: v => v >= 0.9 ? 0 : v >= 0.8 ? 1 : 2 },
  { id: "temp", label: "Temperature",  unit: "°C", min: 0,   max: 90,  dp: 1, get: r => pcsNum(r.Temperature),  zone: v => v <= 55 ? 0 : v <= 70 ? 1 : 2 },
  { id: "eff",  label: "Efficiency",   unit: "%",  min: 80,  max: 100, dp: 1, get: r => pcsNum(r.Efficiency),   zone: v => v >= 95 ? 0 : v >= 90 ? 1 : 2 },
  {
    id: "load", label: "Load", unit: "%", min: 0, max: 100, dp: 0,
    get: r => { const p = pcsNum(r.Active_power); return p == null ? null : Math.abs(p) / PCS_CFG.ratedKw * 100; },
    zone: v => v <= 80 ? 0 : v <= 95 ? 1 : 2
  }
];

const PCS = {
  rows: [],            // newest first
  source: null,        // "live" | "demo"
  forceDemo: false,
  note: "",
  t: 0,
  group: "Power",
  range: 60,
  tab: "overview",
  tbl: { q: "", sort: "created_at", dir: -1, page: 0, size: 15 }
};

let pcsTrendChart = null;
let pcsTrendGroup = null;

const pe = id => document.getElementById(id);


/* ─────────── helpers ─────────── */

function pcsNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pcsFmt(v, dp) {
  return v == null ? "--" : Number(v).toFixed(dp);
}

function pcsZone(v, okLo, okHi, wLo, wHi) {
  if (v >= okLo && v <= okHi) return 0;
  if (v >= wLo && v <= wHi) return 1;
  return 2;
}

function pcsAgo() {
  if (!PCS.rows.length) return "--";
  const s = Math.max(0, Math.round((Date.now() - new Date(PCS.rows[0].created_at).getTime()) / 1000));
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
}

function pcsModeClass(mode) {
  const m = String(mode || "").toLowerCase();
  if (m.includes("dis")) return "pill-dis";
  if (m.includes("chg") || m.includes("charg")) return "pill-chg";
  return "pill-idle";
}


/* ─────────── demo data ─────────── */

function pcsRand(a, b) { return a + Math.random() * (b - a); }

function pcsDemoRow(t, ts) {

  const wf = ((t % 150) + 150) % 150;
  const fault = wf >= 60 && wf < 66;

  const P = 45 * Math.sin(t / 25) + 6 * Math.sin(t / 4) + pcsRand(-1, 1);
  const Q = 0.25 * P + pcsRand(-0.5, 0.5);
  const S = Math.hypot(P, Q);
  const Vac = fault ? 196 + pcsRand(-1, 1) : 230 + 2 * Math.sin(t / 9) + pcsRand(-0.6, 0.6);
  const Vdc = 405 + 0.12 * P + pcsRand(-0.8, 0.8);
  const eff = Math.abs(P) < 1 ? 0 : Math.max(90, 97.6 - 0.5 * Math.abs(P) / 45 + pcsRand(-0.1, 0.1));

  return {
    id: 1000 + t,
    created_at: new Date(ts).toISOString(),
    Ac_voltage: Vac,
    Ac_current: S * 1000 / (3 * Vac),
    Frequency: 50 + 0.04 * Math.sin(t / 7) + pcsRand(-0.01, 0.01),
    Active_power: P,
    Reactive_power: Q,
    Power_factor: S ? Math.abs(P) / S : 1,
    Dc_voltage: Vdc,
    Dc_current: P * 1000 / Vdc / 0.97,
    Temperature: 40 + 8 * Math.abs(P) / 45 + 2 * Math.sin(t / 40) + pcsRand(-0.3, 0.3),
    Efficiency: eff,
    Mode: P > 2 ? "Discharge" : P < -2 ? "Charge" : "Standby",
    Fault_code: fault ? 4 : 0
  };
}

function pcsDemoStep() {

  if (PCS.source !== "demo") {

    PCS.source = "demo";
    PCS.rows = [];
    PCS.t = 0;

    const now = Date.now();

    for (let i = 119; i >= 0; i--) {
      PCS.rows.push(pcsDemoRow(PCS.t++, now - i * 5000));
    }

    PCS.rows.reverse();

  } else {

    PCS.rows.unshift(pcsDemoRow(PCS.t++, Date.now()));
    PCS.rows.length = Math.min(PCS.rows.length, PCS_CFG.limit);
  }
}


/* ─────────── fetch ─────────── */

async function getPCSData() {

  let rows = null;
  let note = "";

  if (!PCS.forceDemo) {

    try {

      const { data, error } = await db
        .from(PCS_CFG.table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PCS_CFG.limit);

      if (error) note = `Table "${PCS_CFG.table}" not reachable`;
      else if (!data || !data.length) note = `Table "${PCS_CFG.table}" has no rows yet`;
      else rows = data;

    } catch (e) {
      note = String(e.message || e);
    }

  } else {
    note = "Demo mode is on";
  }

  if (rows) {
    PCS.source = "live";
    PCS.rows = rows;
    PCS.note = "";
  } else {
    PCS.note = note;
    pcsDemoStep();
  }

  pcsRenderAll();
}

function pcsToggleDemo() {
  PCS.forceDemo = !PCS.forceDemo;
  getPCSData();
}


/* ─────────── render: banner ─────────── */

function pcsStatus() {

  const l = PCS.rows[0];
  const code = Number(l.Fault_code || 0);
  const age = (Date.now() - new Date(l.created_at).getTime()) / 1000;

  if (code !== 0) {
    return { cls: "fault", title: "PCS Fault", sub: PCS_FAULTS[code] || ("Fault code " + code) };
  }

  if (PCS.source === "live" && age > PCS_CFG.staleSec) {
    return { cls: "stale", title: "No recent data", sub: "Last reading " + pcsAgo() };
  }

  return { cls: "ok", title: "PCS Online", sub: "Mode: " + (l.Mode || "--") };
}

function pcsRenderBanner() {

  const s = pcsStatus();
  const demo = PCS.source === "demo";

  pe("pcs-banner").innerHTML = `
    <div class="pcs-banner ${s.cls}">
      <div class="pb-left">
        <span class="pb-dot"></span>
        <div>
          <div class="pb-title">${s.title}</div>
          <div class="pb-sub">${s.sub} · Updated <span id="pb-age">${pcsAgo()}</span></div>
        </div>
      </div>
      <div class="pb-right">
        ${demo ? `<span class="pb-note">${PCS.note || "Simulated data"} — showing simulated values</span>` : ""}
        <span class="src-badge ${demo ? "src-demo" : "src-live"}">${demo ? "DEMO DATA" : "LIVE · SUPABASE"}</span>
        ${demo && !PCS.forceDemo
          ? `<button class="btn-ghost" onclick="getPCSData()">↻ Retry live</button>`
          : `<button class="btn-ghost" onclick="pcsToggleDemo()">${PCS.forceDemo ? "Use live data" : "Use demo data"}</button>`}
      </div>
    </div>`;
}


/* ─────────── render: KPI cards ─────────── */

function pcsSpark(vals, color) {

  const v = vals.filter(x => x != null);
  if (v.length < 2) return "";

  const min = Math.min(...v), max = Math.max(...v), r = (max - min) || 1;
  const w = 100, h = 26;

  const pts = v.map((x, i) =>
    `${(i / (v.length - 1) * w).toFixed(1)},${(h - 2 - ((x - min) / r) * (h - 4)).toFixed(1)}`
  ).join(" ");

  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8"
      stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function pcsKget(d, r) {
  return d.get ? d.get(r) : pcsNum(r[d.k]);
}

function pcsRenderKpis() {

  const hist = PCS.rows.slice(0, 30).reverse();

  pe("pcs-kpis").innerHTML = KPI_DEFS.map(d => {

    const cur = pcsKget(d, PCS.rows[0]);
    const prev = PCS.rows[1] ? pcsKget(d, PCS.rows[1]) : null;

    let delta = "";
    if (cur != null && prev != null) {
      const diff = cur - prev;
      const arrow = Math.abs(diff) < 0.05 ? "■" : diff > 0 ? "▲" : "▼";
      delta = `${arrow} ${Math.abs(diff).toFixed(d.dp)} ${d.unit}`;
    }

    return `
      <div class="kpi-card pcs-kpi">
        <div class="kpi-body">
          <div class="kpi-label">${d.label}</div>
          <div class="kpi-val">${pcsFmt(cur, d.dp)} <em>${d.unit}</em></div>
          <div class="kpi-trend delta">${delta || "&nbsp;"}</div>
          ${pcsSpark(hist.map(r => pcsKget(d, r)), d.color)}
        </div>
        <div class="kpi-icon" style="background:${d.color}">${d.icon}</div>
      </div>`;
  }).join("");
}


/* ─────────── render: power flow ─────────── */

function pcsRenderFlow() {

  const l = PCS.rows[0];

  const P = pcsNum(l.Active_power) || 0;
  const Vdc = pcsNum(l.Dc_voltage), Idc = pcsNum(l.Dc_current);
  const dcKw = (Vdc != null && Idc != null) ? Vdc * Idc / 1000 : null;
  const fault = Number(l.Fault_code || 0) !== 0;

  const dir = P > 0.5 ? "dis" : P < -0.5 ? "chg" : "idle";
  const lineCls = dir === "dis" ? "flow-dis" : dir === "chg" ? "flow-chg" : "flow-idle";
  const rev = dir === "chg" ? " rev" : "";

  const cap = dir === "dis" ? "Discharging  ·  Battery → Grid"
            : dir === "chg" ? "Charging  ·  Grid → Battery"
            : "Standby  ·  No power flow";

  const f = (v, dp) => pcsFmt(v, dp);

  pe("pcs-flow").innerHTML = `
    <svg viewBox="0 0 600 240" class="flow-svg">

      <line class="flow-track" x1="150" y1="115" x2="230" y2="115"/>
      <line class="flow-track" x1="370" y1="115" x2="450" y2="115"/>
      <line class="flow-line ${lineCls}${rev}" x1="150" y1="115" x2="230" y2="115"/>
      <line class="flow-line ${lineCls}${rev}" x1="370" y1="115" x2="450" y2="115"/>

      <text class="flow-lbl" x="190" y="98">${f(dcKw == null ? null : Math.abs(dcKw), 1)} kW</text>
      <text class="flow-lbl" x="410" y="98">${f(Math.abs(P), 1)} kW</text>

      <rect class="node" x="10" y="55" width="140" height="120" rx="14"/>
      <text class="node-t" x="80" y="80">BATTERY · DC</text>
      <text class="node-big" x="80" y="112">${f(Vdc, 1)} V</text>
      <text class="node-v" x="80" y="138">${f(Idc, 1)} A</text>
      <text class="node-v" x="80" y="158">${f(dcKw, 1)} kW</text>

      <rect class="node ${fault ? "node-fault" : "node-pcs"}" x="230" y="45" width="140" height="140" rx="14"/>
      <text class="node-t" x="300" y="72">PCS</text>
      <text class="node-big" x="300" y="106">${l.Mode || "--"}</text>
      <text class="node-v" x="300" y="132">${f(pcsNum(l.Temperature), 1)} °C</text>
      <text class="node-v" x="300" y="152">η ${f(pcsNum(l.Efficiency), 1)} %</text>
      <text class="node-v" x="300" y="172">${fault ? "⚠ " + (PCS_FAULTS[Number(l.Fault_code)] || "Fault") : "Healthy"}</text>

      <rect class="node" x="450" y="55" width="140" height="120" rx="14"/>
      <text class="node-t" x="520" y="80">AC GRID</text>
      <text class="node-big" x="520" y="112">${f(pcsNum(l.Ac_voltage), 1)} V</text>
      <text class="node-v" x="520" y="138">${f(pcsNum(l.Frequency), 2)} Hz</text>
      <text class="node-v" x="520" y="158">PF ${f(pcsNum(l.Power_factor), 2)}</text>

      <text class="flow-cap ${dir}" x="300" y="222">${cap}</text>
    </svg>`;
}


/* ─────────── render: gauges ─────────── */

function pcsGaugeInit() {

  const box = pe("pcs-gauges");
  if (!box || pe("gv-" + GAUGES[0].id)) return;

  const d = "M10 66 A50 50 0 0 1 110 66";

  box.innerHTML = GAUGES.map(g => `
    <div class="gauge">
      <svg viewBox="0 0 120 80">
        <path class="g-bg" d="${d}"/>
        <path class="g-val" id="gv-${g.id}" d="${d}" style="stroke-dasharray:0 157.08"/>
        <text class="g-num" id="gt-${g.id}" x="60" y="58">--</text>
        <text class="g-unit" x="60" y="74">${g.unit}</text>
      </svg>
      <div class="g-label">${g.label}</div>
      <div class="g-range"><span>${g.min}</span><span>${g.max}</span></div>
    </div>`).join("");
}

function pcsRenderGauges() {

  pcsGaugeInit();

  const l = PCS.rows[0];

  GAUGES.forEach(g => {

    const v = g.get(l);
    const arc = pe("gv-" + g.id);
    const txt = pe("gt-" + g.id);
    if (!arc || !txt) return;

    if (v == null) {
      arc.style.strokeDasharray = "0 157.08";
      txt.textContent = "--";
      return;
    }

    const frac = Math.max(0, Math.min(1, (v - g.min) / (g.max - g.min)));

    arc.style.strokeDasharray = `${(frac * 157.08).toFixed(1)} 157.08`;
    arc.style.stroke = ZC[g.zone(v)];
    txt.textContent = v.toFixed(g.dp);
  });
}


/* ─────────── render: trends ─────────── */

function pcsInitTrendUI() {

  pe("pcs-chips").innerHTML = Object.keys(PCS_GROUPS).map(g =>
    `<button class="chip ${g === PCS.group ? "active" : ""}" onclick="pcsSetGroup('${g}')">${g}</button>`
  ).join("");

  pe("pcs-range").innerHTML = [30, 60, 120, 200].map(n =>
    `<button class="rtab ${n === PCS.range ? "active" : ""}" onclick="pcsSetRange(${n})">Last ${n}</button>`
  ).join("");
}

function pcsSetGroup(g) {
  PCS.group = g;
  pcsInitTrendUI();
  pcsRenderTrend();
}

function pcsSetRange(n) {
  PCS.range = n;
  pcsInitTrendUI();
  pcsRenderTrend();
}

function pcsEnergy(rows) {

  let dis = 0, chg = 0;

  for (let i = 1; i < rows.length; i++) {

    const dt = Math.min(
      (new Date(rows[i].created_at) - new Date(rows[i - 1].created_at)) / 3600000, 1
    );

    const P = pcsNum(rows[i].Active_power) || 0;

    if (dt <= 0) continue;

    if (P > 0) dis += P * dt;
    else chg += -P * dt;
  }

  return { dis, chg };
}

function pcsRenderStats(rows, keys) {

  let html = "";

  keys.forEach(k => {

    const v = rows.map(r => pcsNum(r[k])).filter(x => x != null);
    if (!v.length) return;

    const mn = Math.min(...v), mx = Math.max(...v);
    const av = v.reduce((a, b) => a + b, 0) / v.length;
    const f = FIELD[k];

    html += `
      <div class="stat">
        <div class="stat-h"><i style="background:${f.color}"></i>${f.label}</div>
        <div class="stat-r">
          <span><em>MIN</em>${mn.toFixed(f.dp)}</span>
          <span><em>AVG</em>${av.toFixed(f.dp)}</span>
          <span><em>MAX</em>${mx.toFixed(f.dp)}</span>
        </div>
      </div>`;
  });

  if (PCS.group === "Power") {

    const e = pcsEnergy(rows);

    html += `
      <div class="stat">
        <div class="stat-h">Energy in this window</div>
        <div class="stat-r">
          <span><em>DISCHARGED</em>${e.dis.toFixed(3)} kWh</span>
          <span><em>CHARGED</em>${e.chg.toFixed(3)} kWh</span>
        </div>
      </div>`;
  }

  pe("pcs-stats").innerHTML = html;
}

function pcsRenderTrend() {

  const canvas = pe("pcsTrendChart");
  if (!canvas || !PCS.rows.length) return;

  const rows = PCS.rows.slice(0, PCS.range).reverse();
  const keys = PCS_GROUPS[PCS.group];

  const labels = rows.map(r =>
    new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  const datasets = keys.map(k => {
    const f = FIELD[k];
    return {
      label: f.unit ? `${f.label} (${f.unit})` : f.label,
      data: rows.map(r => pcsNum(r[k])),
      borderColor: f.color,
      backgroundColor: f.color + "22",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: keys.length === 1,
      spanGaps: true
    };
  });

  if (pcsTrendChart && pcsTrendGroup === PCS.group) {

    pcsTrendChart.data.labels = labels;
    pcsTrendChart.data.datasets.forEach((d, i) => { d.data = datasets[i].data; });
    pcsTrendChart.update("none");

  } else {

    if (pcsTrendChart) pcsTrendChart.destroy();

    pcsTrendGroup = PCS.group;

    pcsTrendChart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        ...CHART_DEFAULTS,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          ...CHART_DEFAULTS.plugins,
          tooltip: { padding: 10, boxPadding: 4 }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { family: "Inter", size: 11 }, color: "#6B6B6B" } },
          y: { grid: { color: "#EDEDED" }, ticks: { font: { family: "Inter", size: 11 }, color: "#6B6B6B" } }
        }
      }
    });
  }

  pcsRenderStats(rows, keys);
}


/* ─────────── render: data table ─────────── */

function pcsInitTableUI() {

  pe("pcs-tbl-ctl").innerHTML = `
    <input id="pcs-q" type="search" placeholder="Search…" oninput="pcsTblSearch(this.value)"/>
    <select onchange="pcsTblSize(this.value)">
      <option value="15">15 / page</option>
      <option value="30">30 / page</option>
      <option value="50">50 / page</option>
    </select>
    <button class="btn-ghost" onclick="pcsExportCSV()">⬇ Export CSV</button>`;
}

function pcsTblSearch(q) { PCS.tbl.q = q; PCS.tbl.page = 0; pcsRenderTable(); }
function pcsTblSize(n)   { PCS.tbl.size = Number(n); PCS.tbl.page = 0; pcsRenderTable(); }
function pcsTblSort(k) {
  if (PCS.tbl.sort === k) PCS.tbl.dir *= -1;
  else { PCS.tbl.sort = k; PCS.tbl.dir = -1; }
  PCS.tbl.page = 0;
  pcsRenderTable();
}
function pcsTblPage(d) { PCS.tbl.page += d; pcsRenderTable(); }

function pcsFiltered() {

  let rows = PCS.rows.slice();
  const q = PCS.tbl.q.trim().toLowerCase();

  if (q) {
    rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }

  const k = PCS.tbl.sort, d = PCS.tbl.dir;

  rows.sort((a, b) => {

    let x = a[k], y = b[k];

    if (k === "created_at") {
      x = new Date(x).getTime();
      y = new Date(y).getTime();
    } else {
      const nx = Number(x), ny = Number(y);
      if (x !== "" && y !== "" && Number.isFinite(nx) && Number.isFinite(ny)) { x = nx; y = ny; }
    }

    return x > y ? d : x < y ? -d : 0;
  });

  return rows;
}

function pcsCell(k, v) {

  if (v === null || v === undefined) return "--";
  if (k === "created_at") return new Date(v).toLocaleString();
  if (k === "Mode") return `<span class="pill ${pcsModeClass(v)}">${v}</span>`;
  if (k === "Fault_code") {
    const c = Number(v);
    return c === 0 ? `<span class="pill pill-idle">0</span>` : `<span class="pill pill-fault">${c} · ${PCS_FAULTS[c] || "Fault"}</span>`;
  }

  const n = Number(v);
  if (v !== "" && typeof v !== "boolean" && Number.isFinite(n)) {
    return Number.isInteger(n) ? n : n.toFixed(2);
  }

  return v;
}

function pcsRenderTable() {

  const wrap = pe("pcs-table");
  if (!wrap || !PCS.rows.length) return;

  const cols = Object.keys(PCS.rows[0]);
  const all = pcsFiltered();
  const pages = Math.max(1, Math.ceil(all.length / PCS.tbl.size));

  PCS.tbl.page = Math.max(0, Math.min(PCS.tbl.page, pages - 1));

  const slice = all.slice(PCS.tbl.page * PCS.tbl.size, (PCS.tbl.page + 1) * PCS.tbl.size);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>${cols.map(c => `
          <th class="${PCS.tbl.sort === c ? "sorted" : ""}" onclick="pcsTblSort('${c}')">
            ${c}${PCS.tbl.sort === c ? (PCS.tbl.dir > 0 ? " ▲" : " ▼") : ""}
          </th>`).join("")}</tr>
      </thead>
      <tbody>
        ${slice.length
          ? slice.map(r => `<tr>${cols.map(c => `<td>${pcsCell(c, r[c])}</td>`).join("")}</tr>`).join("")
          : `<tr><td colspan="${cols.length}" class="pcs-empty">No matching records</td></tr>`}
      </tbody>
    </table>`;

  pe("pcs-pager").innerHTML = `
    <span>${all.length} records</span>
    <span>
      <button class="btn-ghost" onclick="pcsTblPage(-1)" ${PCS.tbl.page === 0 ? "disabled" : ""}>‹ Prev</button>
      <span style="margin:0 10px">Page ${PCS.tbl.page + 1} / ${pages}</span>
      <button class="btn-ghost" onclick="pcsTblPage(1)" ${PCS.tbl.page >= pages - 1 ? "disabled" : ""}>Next ›</button>
    </span>`;
}

function pcsExportCSV() {

  const rows = pcsFiltered();
  if (!rows.length) return;

  const cols = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const csv = [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `pcs_data_${Date.now()}.csv`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}


/* ─────────── render: faults ─────────── */

function pcsFaultEvents() {

  const asc = PCS.rows.slice().reverse();
  const ev = [];
  let cur = null;

  asc.forEach(r => {

    const c = Number(r.Fault_code || 0);

    if (c !== 0) {
      if (cur && cur.code === c) cur.end = r.created_at;
      else { cur = { code: c, start: r.created_at, end: r.created_at }; ev.push(cur); }
    } else {
      cur = null;
    }
  });

  return ev.reverse();
}

function pcsRenderFaults() {

  const l = PCS.rows[0];
  const code = Number(l.Fault_code || 0);
  const ev = pcsFaultEvents();

  pe("pcs-fault-now").innerHTML = code === 0
    ? `<div class="fault-now ok"><div class="fault-ico">✅</div><h3>All clear</h3>
         <p>No active PCS fault</p></div>`
    : `<div class="fault-now bad"><div class="fault-ico">🚨</div><h3>${PCS_FAULTS[code] || "Fault code " + code}</h3>
         <p>Code ${code} · active since ${new Date(ev[0].start).toLocaleTimeString()}</p></div>`;

  const legend = Object.entries(PCS_FAULTS).filter(([c]) => c !== "0")
    .map(([c, n]) => `<span class="chip legend">${c} · ${n}</span>`).join("");

  pe("pcs-fault-now").innerHTML += `
    <div class="legend-title">Fault codes</div>
    <div class="chip-row">${legend}</div>`;

  pe("pcs-fault-list").innerHTML = ev.length
    ? ev.map((e, i) => {

        const dur = Math.max(5, Math.round((new Date(e.end) - new Date(e.start)) / 1000));
        const active = i === 0 && code !== 0;

        return `
          <div class="fault-row">
            <div>
              <div class="fr-title">🔴 ${PCS_FAULTS[e.code] || "Fault " + e.code}
                <span class="sev-badge ${active ? "sev-critical" : "sev-info"}">${active ? "ACTIVE" : "CLEARED"}</span></div>
              <div class="fr-sub">${new Date(e.start).toLocaleString()}</div>
            </div>
            <div class="fr-dur">${dur}s</div>
          </div>`;
      }).join("")
    : `<div class="pcs-empty">No faults in the loaded window</div>`;

  const badge = pe("pcs-fault-badge");
  if (badge) {
    badge.textContent = ev.length;
    badge.classList.toggle("hidden", ev.length === 0);
  }
}


/* ─────────── orchestration ─────────── */

function pcsRenderAll() {

  if (!PCS.rows.length || !pe("pcs-banner")) return;

  pcsRenderBanner();
  pcsRenderKpis();
  pcsRenderFlow();
  pcsRenderGauges();
  pcsRenderFaults();
  pcsRenderTable();

  if (PCS.tab === "trends") pcsRenderTrend();
}

function pcsOnShow() {

  if (!PCS.rows.length) {
    pe("pcs-banner").innerHTML = `<div class="pcs-banner stale"><div class="pb-title">Loading PCS data…</div></div>`;
    getPCSData();
    return;
  }

  pcsRenderAll();
}

function switchPcsTab(name, btn) {

  PCS.tab = name;

  document.querySelectorAll(".pcs-panel").forEach(p => p.classList.add("hidden"));
  document.querySelectorAll(".pcs-tab").forEach(b => b.classList.remove("active"));

  const panel = pe("pcs-tab-" + name);
  if (panel) panel.classList.remove("hidden");
  if (btn) btn.classList.add("active");

  if (name === "trends") {
    pcsRenderTrend();
    if (pcsTrendChart) pcsTrendChart.resize();
  }

  if (name === "data") pcsRenderTable();
}

function destroyPCS() {

  if (pcsTrendChart) {
    pcsTrendChart.destroy();
    pcsTrendChart = null;
  }

  pcsTrendGroup = null;
  PCS.rows = [];
  PCS.source = null;
}

document.addEventListener("DOMContentLoaded", () => {

  pcsInitTrendUI();
  pcsInitTableUI();

  setInterval(() => {
    const el = pe("pb-age");
    if (el && PCS.rows.length) el.textContent = pcsAgo();
  }, 1000);
});
