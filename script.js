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
  const packs = ['Pack 1','Pack 2','Pack 3','Pack 4','Pack 5','Pack 6'];
  const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
  const data  = [];
  hours.forEach(h => {
    const hr = parseInt(h);
    const solar = hr>=6 && hr<=18 ? rand(0,50) : 0; // PV active daytime
    packs.forEach(pack => {
      const soc = rand(65, 95, 1);
      const voltage = rand(48, 54, 1);
      const current = rand(-30, 30, 1); // negative=discharge, positive=charge
      const power = (voltage * current / 1000);
      const temp = rand(25, 38, 1);
      data.push({ hour:h, pack, soc, voltage, current, power, temp, pv: solar });
    });
  });
  return data;
}

const RAW_DATA = generateHourlyData();

function getFiltered() {
  const pack = document.getElementById('sel-pack')?.value || 'All Packs';
  return RAW_DATA.filter(d => pack==='All Packs' || d.pack===pack);
}

function calcKPIs(data) {
  const avgSOC     = data.reduce((s,d)=>s+d.soc, 0) / data.length;
  const avgVoltage = data.reduce((s,d)=>s+d.voltage, 0) / data.length;
  const avgCurrent = data.reduce((s,d)=>s+d.current, 0) / data.length;
  const avgTemp    = data.reduce((s,d)=>s+d.temp, 0) / data.length;
  const avgPower   = data.reduce((s,d)=>s+d.power, 0) / data.length;
  const avgPV      = data.reduce((s,d)=>s+d.pv, 0) / data.length;
  return {
    soc: avgSOC,
    voltage: avgVoltage,
    current: avgCurrent,
    temp: avgTemp,
    power: avgPower,
    pv: avgPV,
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
    if (current >= target) { el.textContent = target.toFixed(1); clearInterval(iv); }
    else el.textContent = current.toFixed(1);
  }, 25);
}

function updateKPIs() {
  const kpis = calcKPIs(getFiltered());
  animateValue('kpi-soc', kpis.soc);
  animateValue('kpi-voltage', kpis.voltage);
  animateValue('kpi-current', kpis.current);
  animateValue('kpi-temp', kpis.temp);
  animateValue('kpi-power', Math.abs(kpis.power));
  animateValue('kpi-pv', kpis.pv);
  
  // Update trend text
  const currTrend = document.getElementById('kpi-current-trend');
  const powTrend  = document.getElementById('kpi-power-trend');
  if (kpis.current > 0) {
    currTrend.textContent = 'Charging';
    currTrend.className = 'kpi-trend up';
    powTrend.textContent = 'Charging';
    powTrend.className = 'kpi-trend up';
  } else {
    currTrend.textContent = 'Discharging';
    currTrend.className = 'kpi-trend down';
    powTrend.textContent = 'Discharging';
    powTrend.className = 'kpi-trend down';
  }
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

// Line chart — power flow
function buildLineChart() {
  const data = getFiltered();
  const byHour = {};
  data.forEach(d => {
    if (!byHour[d.hour]) byHour[d.hour] = {power:0, pv:0, count:0};
    byHour[d.hour].power += d.power;
    byHour[d.hour].pv += d.pv;
    byHour[d.hour].count++;
  });
  const labels = Object.keys(byHour).sort();
  const powerVals = labels.map(l => byHour[l].power / byHour[l].count);
  const pvVals = labels.map(l => byHour[l].pv / byHour[l].count);

  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets:[
        {
          label: 'Charge/Discharge Power (kW)',
          data: powerVals,
          borderColor: '#FF924C',
          backgroundColor: 'rgba(255,146,76,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#FF924C',
        },
        {
          label: 'PV Input (kW)',
          data: pvVals,
          borderColor: '#3FB950',
          backgroundColor: 'rgba(63,185,80,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#3FB950',
        }
      ]
    },
    options: { ...CHART_DEFAULTS, aspectRatio: 2 }
  });
}

// Bar chart — pack voltage & SOC
function buildBarChart() {
  const data = getFiltered();
  const packs = ['Pack 1','Pack 2','Pack 3','Pack 4','Pack 5','Pack 6'];
  const colors = ['#FF924C','#A7B89C','#E0A25B','#D75B5B','#E57A2A','#3FB950'];
  const voltage = packs.map(pack => {
    const filtered = data.filter(d=>d.pack===pack);
    return filtered.length ? filtered.reduce((s,d)=>s+d.voltage,0)/filtered.length : 0;
  });
  const soc = packs.map(pack => {
    const filtered = data.filter(d=>d.pack===pack);
    return filtered.length ? filtered.reduce((s,d)=>s+d.soc,0)/filtered.length : 0;
  });

  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: packs,
      datasets:[
        {
          label:'Voltage (V)',
          data: voltage,
          backgroundColor: colors,
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          label:'SOC (%)',
          data: soc,
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

  let points=24, labels=[], soc=[], power=[], anomalies=[];

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
    const s = Math.round(70+rand(0,25));
    const p = rand(-20, 30, 1);
    const isAnom = rand(0,1)>0.85;
    soc.push(s);
    power.push(p);
    anomalies.push(isAnom);
  }

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets:[
        {
          label:'Power (kW)',
          data: power,
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
          label:'SOC (%)',
          data: soc,
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
  
  // 16S cells (4x4 grid)
  for (let i=1; i<=16; i++) {
    const v = rand(3.0, 3.6, 2);
    const status = v<3.1||v>3.5?'alert':v<3.2||v>3.4?'caution':'balanced';
    const bg = status==='alert'?'#D75B5B':status==='caution'?'#E0A25B':'#A7B89C';

    const el = document.createElement('div');
    el.className = 'hm-zone';
    el.style.background = bg;
    el.innerHTML = `
      <div class="z-name">Cell ${i}</div>
      <div class="z-kwh">${v}V</div>
      <div class="z-tip">
        <strong>Cell ${i}</strong><br>
        Voltage: <strong>${v}V</strong><br>
        Status: <strong>${status}</strong>
      </div>`;
    grid.appendChild(el);
  }
}

// ── ALERTS ────────────────────────────────
const ALERTS = [
  { id:'a1', sev:'critical', title:'Cell Voltage Imbalance Detected', equip:'Pack 3 — Cell 12', time:15, threshold:3.35, current:3.58,
    desc:'Cell 12 voltage exceeds safe threshold. Immediate balancing required.' },
  { id:'a2', sev:'warning',  title:'High Temperature Warning', equip:'Pack 2 — BMS Sensor', time:45, threshold:35, current:39,
    desc:'Pack 2 temperature elevated. Check cooling system.' },
  { id:'a3', sev:'critical', title:'SOC Drop Below Safety Threshold', equip:'Pack 5 — Main Battery', time:120, threshold:20, current:18,
    desc:'Pack 5 SOC critically low. Charging recommended immediately.' },
  { id:'a4', sev:'warning',  title:'Inverter Communication Loss', equip:'Inverter 1 — CAN Bus', time:180, threshold:0, current:0,
    desc:'Inverter 1 lost CAN communication. Check wiring and power.' },
  { id:'a5', sev:'info',     title:'Scheduled Maintenance Due', equip:'BMS — Pack 1', time:240, threshold:0, current:0,
    desc:'Routine BMS calibration and cell balancing scheduled.' },
];

const REPORTS = [
  { id:'r1', title:'Battery Health Summary', summary:'Overall system health at 94%, all packs within spec',
    details:['Pack 1-6 SOH above 92%','Cell voltage delta <50mV across all packs','Average cycle count: 1,245 cycles','No critical degradation detected'],
    recs:['Continue current charge/discharge cycles','Monitor Pack 3 Cell 12 for voltage drift','Schedule balancing for Pack 2 next week'] },
  { id:'r2', title:'Power Flow Analysis', summary:'Charge efficiency at 96.2%, PV utilization 89%',
    details:['PV array generating 42kW average','Charge efficiency: 96.2% (target: 95%)','Discharge efficiency: 94.8%','Peak power: 48kW at 14:30'],
    recs:['Optimize MPPT settings for morning hours','Review inverter settings for peak shaving','Consider battery pre-cooling during charge'] },
  { id:'r3', title:'Thermal Management Report', summary:'Temperature range 28-38°C, cooling system optimal',
    details:['Avg pack temp: 32.4°C','Max delta between packs: 4.2°C','Cooling system runtime: 18hrs/day','No thermal runaway events'],
    recs:['Maintain current cooling schedule','Inspect Pack 2 thermal sensors','Clean cooling fans quarterly'] },
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
