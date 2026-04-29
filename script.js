/* ═══════════════════════════════════════════
   EMS — script.js  (UIBakery style)
═══════════════════════════════════════════ */

// ── AUTH ──────────────────────────────────
const USERS = { admin:'admin123', sodion:'sodion123', operator:'op2024' };

function login() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const err = document.getElementById('login-error');
  if (USERS[u] && USERS[u] === p) {
    err.classList.add('hidden');
    document.getElementById('user-chip').textContent = u[0].toUpperCase();
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    initDashboard();
  } else {
    err.classList.remove('hidden');
  }
}
function logout() {
  document.getElementById('dashboard-page').classList.remove('active');
  document.getElementById('login-page').classList.add('active');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  destroyCharts();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-page').classList.contains('active')) login();
});

// ── CLOCK ─────────────────────────────────
setInterval(() => {
  const n = new Date();
  const pad = v => String(v).padStart(2,'0');
  document.getElementById('clock').textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}, 1000);

// ── TABS ──────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  if (btn) btn.classList.add('active');
  if (name === 'trends') buildTrendChart(currentRange);
}

// ── FILTERS ───────────────────────────────
let selectedLocation = '';
function onFilterChange() { updateKPIs(); buildLineChart(); buildBarChart(); }
function clearLocation() {
  selectedLocation = '';
  document.getElementById('loc-pill').classList.add('hidden');
  onFilterChange();
}
function setLocation(loc) {
  selectedLocation = loc;
  document.getElementById('loc-label').textContent = loc;
  document.getElementById('loc-pill').classList.remove('hidden');
  showToast(`Filter Applied: ${loc}`);
  onFilterChange();
}

// ── DATA GENERATION ───────────────────────
function rand(min, max, dec=0) { return parseFloat((Math.random()*(max-min)+min).toFixed(dec)); }

function generateHourlyData() {
  const depts = ['Production','Warehouse','Office','HVAC','Lighting'];
  const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
  const locs  = ['Building A','Building B','Building C'];
  const data  = [];
  hours.forEach(h => {
    const hr = parseInt(h);
    const peak = hr>=9 && hr<=17 ? 1.5 : 1;
    depts.forEach(dept => {
      locs.forEach(loc => {
        const locM = loc==='Building A'?1.3:loc==='Building B'?1.0:0.8;
        data.push({ hour:h, dept, loc, consumption: Math.round((150+rand(0,100))*peak*locM) });
      });
    });
  });
  return data;
}

const RAW_DATA = generateHourlyData();

function getFiltered() {
  const dept  = document.getElementById('sel-dept')?.value  || 'All';
  const equip = document.getElementById('sel-equip')?.value || 'All Equipment';
  return RAW_DATA.filter(d => {
    const deptOk = dept==='All' || d.dept===dept;
    const locOk  = !selectedLocation || d.loc===selectedLocation;
    return deptOk && locOk;
  });
}

function calcKPIs(data) {
  const total = data.reduce((s,d)=>s+d.consumption,0);
  const peak  = Math.max(...data.map(d=>d.consumption),0);
  return {
    total, peak,
    eff:   Math.round(75+rand(0,15)),
    cost:  Math.round(total*0.12),
    saved: Math.round(total*0.18),
  };
}

// ── KPI CARDS ─────────────────────────────
function animateValue(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step  = target / 40;
  const iv    = setInterval(() => {
    current += step;
    if (current >= target) { el.textContent = Math.round(target).toLocaleString(); clearInterval(iv); }
    else el.textContent = Math.round(current).toLocaleString();
  }, 25);
}

function updateKPIs() {
  const kpis = calcKPIs(getFiltered());
  animateValue('kpi-total', kpis.total);
  animateValue('kpi-peak',  kpis.peak);
  animateValue('kpi-eff',   kpis.eff);
  animateValue('kpi-cost',  kpis.cost);
  animateValue('kpi-saved', kpis.saved);
}

// ── CHARTS ────────────────────────────────
let lineChart=null, barChart=null, trendChart=null;

function destroyCharts() {
  [lineChart,barChart,trendChart].forEach(c=>{ if(c) c.destroy(); });
  lineChart=barChart=trendChart=null;
}

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend:{ labels:{ font:{family:'Inter',size:11}, color:'#6B6B6B', boxWidth:12 } } },
  scales: {
    x: { grid:{ color:'#E0E0E0' }, ticks:{ font:{family:'Inter',size:11}, color:'#6B6B6B' } },
    y: { grid:{ color:'#E0E0E0' }, ticks:{ font:{family:'Inter',size:11}, color:'#6B6B6B' } },
  }
};

// Line chart — hourly consumption
function buildLineChart() {
  const data = getFiltered();
  const byHour = {};
  data.forEach(d => {
    byHour[d.hour] = (byHour[d.hour]||0) + d.consumption;
  });
  const labels = Object.keys(byHour).sort();
  const values = labels.map(l => byHour[l]);

  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets:[{
        label: 'Energy Consumption (kWh)',
        data: values,
        borderColor: '#FF924C',
        backgroundColor: 'rgba(255,146,76,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#FF924C',
      }]
    },
    options: { ...CHART_DEFAULTS, aspectRatio: 2 }
  });
}

// Bar chart — department breakdown
function buildBarChart() {
  const data = getFiltered();
  const depts = ['Production','Warehouse','Office','HVAC','Lighting'];
  const colors = ['#FF924C','#A7B89C','#E0A25B','#D75B5B','#E57A2A'];
  const consumption = depts.map(dept =>
    data.filter(d=>d.dept===dept).reduce((s,d)=>s+d.consumption,0)
  );
  const efficiency = depts.map(()=>Math.round(75+rand(0,20)));

  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: depts,
      datasets:[
        {
          label:'Consumption (kWh)',
          data: consumption,
          backgroundColor: colors,
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          label:'Efficiency (%)',
          data: efficiency,
          backgroundColor: 'rgba(167,184,156,0.5)',
          borderRadius: 6,
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 2,
      scales: {
        x:  { grid:{color:'#E0E0E0'}, ticks:{font:{family:'Inter',size:11},color:'#6B6B6B'} },
        y:  { grid:{color:'#E0E0E0'}, ticks:{font:{family:'Inter',size:11},color:'#6B6B6B'}, position:'left' },
        y1: { grid:{display:false},   ticks:{font:{family:'Inter',size:11},color:'#6B6B6B'}, position:'right', max:100 },
      }
    }
  });
}

// Trend chart
let currentRange = 'daily';
function setRange(range, btn) {
  currentRange = range;
  document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  buildTrendChart(range);
}

function buildTrendChart(range) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (trendChart) trendChart.destroy();

  let points=24, labels=[], consumption=[], efficiency=[], anomalies=[];

  if (range==='weekly')  points=7;
  if (range==='monthly') points=30;
  if (range==='yearly')  points=12;

  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i=points-1;i>=0;i--) {
    if (range==='daily')        labels.push(`${String(24-i).padStart(2,'0')}:00`);
    else if (range==='yearly')  labels.push(months[(12-i)%12]);
    else {
      const d=new Date(); d.setDate(d.getDate()-i);
      labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
    }
    const c = Math.round(2000+rand(0,1000));
    const e = Math.round(70+rand(0,20));
    const isAnom = rand(0,1)>0.85;
    consumption.push(c);
    efficiency.push(e);
    anomalies.push(isAnom);
  }

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets:[
        {
          label:'Consumption (kWh)',
          data: consumption,
          borderColor: '#FF924C',
          backgroundColor: 'rgba(255,146,76,0.06)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          yAxisID: 'y',
          pointRadius: anomalies.map(a=>a?6:3),
          pointBackgroundColor: anomalies.map(a=>a?'#D75B5B':'#FF924C'),
          pointBorderColor: anomalies.map(a=>a?'#fff':'#FF924C'),
          pointBorderWidth: anomalies.map(a=>a?2:0),
        },
        {
          label:'Efficiency (%)',
          data: efficiency,
          borderColor: '#A7B89C',
          borderWidth: 2,
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#A7B89C',
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 2.8,
      scales: {
        x:  { grid:{color:'#E0E0E0'}, ticks:{font:{family:'Inter',size:11},color:'#6B6B6B',maxRotation:45} },
        y:  { grid:{color:'#E0E0E0'}, ticks:{font:{family:'Inter',size:11},color:'#6B6B6B'}, position:'left' },
        y1: { grid:{display:false},   ticks:{font:{family:'Inter',size:11},color:'#6B6B6B'}, position:'right', max:100 },
      }
    }
  });
}

// ── HEATMAP ───────────────────────────────
function buildHeatmap() {
  const grid = document.getElementById('hm-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const zones = [
    {name:'Zone A',area:'Floor 1'},
    {name:'Zone B',area:'Floor 1'},
    {name:'Zone C',area:'Floor 1'},
    {name:'Zone D',area:'Floor 2'},
    {name:'Zone E',area:'Floor 2'},
    {name:'Zone F',area:'Floor 2'},
    {name:'Zone G',area:'Floor 3'},
    {name:'Zone H',area:'Floor 3'},
    {name:'Zone I',area:'Floor 3'},
  ];
  const locs = ['Building A','Building B','Building C'];

  zones.forEach((z,i)=>{
    const c = Math.round(100+rand(0,400));
    const e = Math.round(60+rand(0,35));
    const status = c>400?'high':c>250?'caution':'efficient';
    const bg = status==='high'?'#D75B5B':status==='caution'?'#E0A25B':'#A7B89C';
    const loc = locs[Math.floor(i/3)];

    const el = document.createElement('div');
    el.className = 'hm-zone';
    el.style.background = bg;
    el.innerHTML = `
      <div class="z-name">${z.name}</div>
      <div class="z-area">${z.area}</div>
      <div class="z-kwh">${c} kWh</div>
      <div class="z-tip">
        <strong>${z.name} — ${z.area}</strong><br>
        Consumption: <strong>${c} kWh</strong><br>
        Efficiency: <strong>${e}%</strong><br>
        <span style="color:#FF924C;font-size:11px">Click to filter dashboard</span>
      </div>`;
    el.onclick = () => setLocation(loc);
    grid.appendChild(el);
  });
}

// ── ALERTS ────────────────────────────────
const ALERTS = [
  { id:'a1', sev:'critical', title:'Critical Consumption Threshold Exceeded', equip:'Chiller Unit #3 — Building A', time:15, threshold:500, current:725,
    desc:'Chiller Unit #3 exceeded maximum consumption threshold by 45%.' },
  { id:'a2', sev:'warning',  title:'Efficiency Drop Detected', equip:'Motor Array #2 — Production Floor', time:45, threshold:85, current:72,
    desc:'Production motors showing 15% efficiency decline over past 6 hours.' },
  { id:'a3', sev:'critical', title:'Peak Demand Alert', equip:'Building B — Main Grid', time:120, threshold:3000, current:2850,
    desc:'Building B approaching peak demand limit during business hours.' },
  { id:'a4', sev:'warning',  title:'Unusual Pattern Detected', equip:'HVAC System — Office Wing', time:180, threshold:200, current:285,
    desc:'Office HVAC running at high capacity during off-hours.' },
  { id:'a5', sev:'info',     title:'Maintenance Reminder', equip:'Lighting Control — Warehouse', time:240, threshold:0, current:0,
    desc:'Scheduled maintenance due for lighting systems in Warehouse.' },
];

const REPORTS = [
  { id:'r1', title:'Energy Efficiency Summary', summary:'Overall facility efficiency at 82%, exceeding target by 7%',
    details:['Production area achieved 88% efficiency','Office wing improved by 12% through HVAC optimization','Warehouse lighting retrofit reduced consumption by 23%','Total energy savings: 4,250 kWh this month'],
    recs:['Maintain current HVAC schedules','Consider extending lighting retrofit','Schedule equipment calibration for Motor Array #2'] },
  { id:'r2', title:'High Consumption Areas', summary:'Three zones identified above acceptable thresholds',
    details:['Chiller Unit #3: 18 hrs/day vs 12 hr target','Building B Grid: 95% of capacity limit','Production Motors: 15% higher vs baseline'],
    recs:['Immediate inspection of Chiller Unit #3','Implement staggered start times for Building B','Review production motor loads'] },
  { id:'r3', title:'Cost Analysis & Projections', summary:'Monthly costs trending $3,200 below budget',
    details:['Avg cost per kWh: $0.12','Monthly savings: $2,450','Peak demand charges reduced 18%','Projected annual savings: $28,600'],
    recs:['Allocate savings toward monitoring equipment','Invest in preventive maintenance','Consider renewable energy for Building A'] },
];

const SEV_ICON  = { critical:'🔴', warning:'⚠️', info:'ℹ️' };
const SEV_CLASS = { critical:'sev-critical', warning:'sev-warning', info:'sev-info' };
const SEV_LABEL = { critical:'Critical', warning:'Warning', info:'Info' };

function fmtTime(mins) {
  if (mins<60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ago`;
}

function buildAlerts() {
  const list = document.getElementById('alerts-list');
  if (!list) return;
  const critCount = ALERTS.filter(a=>a.sev==='critical').length;
  document.getElementById('crit-badge').textContent = `${critCount} Critical`;

  list.innerHTML = ALERTS.map(a=>`
    <div class="acc-item">
      <button class="acc-trigger" onclick="toggleAcc('${a.id}')">
        <span class="acc-sev-icon">${SEV_ICON[a.sev]}</span>
        <div class="acc-meta">
          <div class="acc-meta-row">
            <span class="acc-title">${a.title}</span>
            <span class="sev-badge ${SEV_CLASS[a.sev]}">${SEV_LABEL[a.sev]}</span>
          </div>
          <div class="acc-sub">${a.equip}</div>
          <div class="acc-sub">${fmtTime(a.time)}</div>
        </div>
        <span class="acc-chevron" id="chev-${a.id}">▾</span>
      </button>
      <div class="acc-body" id="body-${a.id}">
        <p>${a.desc}</p>
        ${a.threshold>0?`
        <div class="acc-metrics">
          <div class="acc-metric-row"><span>Threshold:</span><span>${a.threshold} kWh</span></div>
          <div class="acc-metric-row"><span>Current Value:</span><span style="color:#D75B5B">${a.current} kWh</span></div>
          <div class="acc-metric-row"><span>Deviation:</span><span style="color:#D75B5B">+${Math.round(((a.current-a.threshold)/a.threshold)*100)}%</span></div>
        </div>`:''}
        <div class="acc-recs">
          <div class="acc-recs-title">Recommended Actions:</div>
          <ul>
            <li>Inspect equipment for mechanical issues or faults</li>
            <li>Review recent operational changes</li>
            <li>Contact maintenance if issue persists beyond 2 hours</li>
          </ul>
        </div>
      </div>
    </div>
  `).join('');
}

function buildReports() {
  const list = document.getElementById('reports-list');
  if (!list) return;
  list.innerHTML = REPORTS.map(r=>`
    <div class="acc-item">
      <button class="acc-trigger" onclick="toggleAcc('${r.id}')">
        <span class="acc-sev-icon">📋</span>
        <div class="acc-meta">
          <div class="acc-title">${r.title}</div>
          <div class="acc-sub" style="margin-top:3px">${r.summary}</div>
        </div>
        <span class="acc-chevron" id="chev-${r.id}">▾</span>
      </button>
      <div class="acc-body" id="body-${r.id}">
        <div class="acc-recs">
          <div class="acc-recs-title">✅ Key Findings</div>
          <ul>${r.details.map(d=>`<li>${d}</li>`).join('')}</ul>
        </div>
        <div class="acc-recs" style="margin-top:10px">
          <div class="acc-recs-title">💡 Recommendations</div>
          <ul>${r.recs.map(rec=>`<li>${rec}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleAcc(id) {
  const body = document.getElementById('body-'+id);
  const chev = document.getElementById('chev-'+id);
  if (!body) return;
  const open = body.classList.toggle('open');
  if (chev) chev.classList.toggle('open', open);
}

// ── TOAST ─────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.add('hidden'), 3000);
}

// ── INIT ──────────────────────────────────
function initDashboard() {
  updateKPIs();
  buildLineChart();
  buildBarChart();
  buildHeatmap();
  buildAlerts();
  buildReports();

  // Live update every 5s
  setInterval(()=>{
    updateKPIs();
    buildLineChart();
  }, 5000);
}
