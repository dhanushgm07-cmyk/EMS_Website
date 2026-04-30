// ===================== AUTH =====================
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  if (u === 'admin' && p === 'admin123') {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    initDashboard();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}
function doLogout() {
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').style.display = 'none';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') doLogin();
});

// ===================== NAV =====================
function switchTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('page-title').textContent = el ? el.textContent.trim() : tab;
  if (tab === 'trends') renderTrendChart(currentRange);
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===================== MOCK DATA =====================
const PACKS = ['Pack 1','Pack 2','Pack 3','Pack 4','Pack 5','Pack 6'];

function randBetween(a, b) { return +(a + Math.random() * (b - a)).toFixed(2); }

function generatePackData() {
  return PACKS.map((name, i) => {
    const soc = randBetween(30, 98);
    const volt = randBetween(340, 420);
    const curr = randBetween(-80, 80);
    const temp = randBetween(22, 45);
    const power = +(curr * volt / 1000).toFixed(2);
    const pvPower = randBetween(0, 25);
    const statuses = ['Charging','Discharging','Idle','Online'];
    const status = curr > 5 ? 'Charging' : curr < -5 ? 'Discharging' : 'Idle';
    const cells = Array.from({length: 16}, (_, j) => {
      const base = volt / 16;
      const deviation = randBetween(-0.25, 0.25);
      const v = +(base + deviation).toFixed(3);
      return { id: `S${j+1}`, voltage: v };
    });
    return { name, soc, volt, curr, temp, power, pvPower, status, cells };
  });
}

let packData = generatePackData();

function aggregateKPIs(data) {
  const n = data.length;
  return {
    soc: +(data.reduce((s,d) => s + d.soc, 0) / n).toFixed(1),
    volt: +(data.reduce((s,d) => s + d.volt, 0) / n).toFixed(1),
    curr: +(data.reduce((s,d) => s + d.curr, 0)).toFixed(1),
    temp: +(data.reduce((s,d) => s + d.temp, 0) / n).toFixed(1),
    power: +(data.reduce((s,d) => s + d.power, 0)).toFixed(2),
    pv: +(data.reduce((s,d) => s + d.pvPower, 0)).toFixed(2),
  };
}

// Realtime line chart data (last 30 points)
const realtimePoints = 30;
let powerChartData = {
  labels: Array.from({length: realtimePoints}, (_,i) => {
    const d = new Date(Date.now() - (realtimePoints - i) * 5000);
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }),
  charge: Array.from({length: realtimePoints}, () => randBetween(-80, 80)),
  pv: Array.from({length: realtimePoints}, () => randBetween(5, 25)),
  load: Array.from({length: realtimePoints}, () => randBetween(10, 50)),
};

// ===================== KPI UPDATE =====================
function animateNum(elId, target, decimals=1) {
  const el = document.getElementById(elId);
  if (!el) return;
  const current = parseFloat(el.textContent) || 0;
  const diff = target - current;
  const steps = 20;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    el.textContent = (current + diff * (step / steps)).toFixed(decimals);
    if (step >= steps) { el.textContent = target.toFixed(decimals); clearInterval(interval); }
  }, 20);
}

function trendArrow(val, threshold=0) {
  const up = val > threshold;
  return { text: (up ? '↑ ' : '↓ ') + Math.abs(val).toFixed(1) + '% from last period', cls: up ? 'up' : 'down' };
}

function updateKPIs(kpis) {
  const fields = [
    { num: 'kpi-soc', bar: 'kpi-soc-bar', trend: 'kpi-soc-trend', val: kpis.soc, max: 100, decimals: 1 },
    { num: 'kpi-volt', bar: 'kpi-volt-bar', trend: 'kpi-volt-trend', val: kpis.volt, max: 450, decimals: 1 },
    { num: 'kpi-curr', bar: 'kpi-curr-bar', trend: 'kpi-curr-trend', val: Math.abs(kpis.curr), max: 200, decimals: 1 },
    { num: 'kpi-temp', bar: 'kpi-temp-bar', trend: 'kpi-temp-trend', val: kpis.temp, max: 60, decimals: 1 },
    { num: 'kpi-power', bar: 'kpi-power-bar', trend: 'kpi-power-trend', val: kpis.power, max: 100, decimals: 2 },
    { num: 'kpi-pv', bar: 'kpi-pv-bar', trend: 'kpi-pv-trend', val: kpis.pv, max: 150, decimals: 2 },
  ];
  fields.forEach(f => {
    animateNum(f.num, f.val, f.decimals);
    const barEl = document.getElementById(f.bar);
    if (barEl) barEl.style.width = Math.min(100, Math.max(0, (Math.abs(f.val) / f.max) * 100)) + '%';
    const trendEl = document.getElementById(f.trend);
    if (trendEl) {
      const t = trendArrow(randBetween(-8, 10));
      trendEl.textContent = t.text;
      trendEl.className = 'kpi-trend ' + t.cls;
    }
  });

  // Power label: show +/- for charge/discharge
  const powerNum = document.getElementById('kpi-power');
  if (powerNum) powerNum.textContent = (kpis.power >= 0 ? '+' : '') + kpis.power.toFixed(2);
}

// ===================== CHARTS =====================
let powerChartInstance = null;
let socBarChartInstance = null;
let trendChartInstance = null;
let currentRange = 'daily';

function loadChartJS(cb) {
  if (window.Chart) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}

function renderPowerChart() {
  const ctx = document.getElementById('powerChart');
  if (!ctx) return;
  if (powerChartInstance) powerChartInstance.destroy();
  powerChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: powerChartData.labels,
      datasets: [
        {
          label: 'Charge/Discharge (A)',
          data: powerChartData.charge,
          borderColor: '#FF924C',
          backgroundColor: 'rgba(255,146,76,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'PV Input (kW)',
          data: powerChartData.pv,
          borderColor: '#7BC67E',
          backgroundColor: 'rgba(123,198,126,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Load (kW)',
          data: powerChartData.load,
          borderColor: '#5B8DD9',
          backgroundColor: 'rgba(91,141,217,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 300 },
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { color: '#E5E5E322' }, ticks: { color: '#6B6B6B', maxTicksLimit: 8, font: { family: 'DM Mono', size: 10 } } },
        y: { grid: { color: '#E5E5E3' }, ticks: { color: '#6B6B6B', font: { family: 'DM Mono', size: 10 } } }
      }
    }
  });
}

function renderSocBarChart() {
  const ctx = document.getElementById('socBarChart');
  if (!ctx) return;
  if (socBarChartInstance) socBarChartInstance.destroy();
  const colors = ['#FF924C','#5B8DD9','#A7B89C','#D75B5B','#E0A25B','#7BC67E'];
  socBarChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: packData.map(d => d.name),
      datasets: [{
        label: 'SOC (%)',
        data: packData.map(d => d.soc),
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` SOC: ${ctx.raw.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6B6B6B', font: { family: 'DM Sans', size: 11 } } },
        y: { max: 100, grid: { color: '#E5E5E3' }, ticks: { color: '#6B6B6B', font: { family: 'DM Mono', size: 10 }, callback: v => v + '%' } }
      }
    }
  });
}

function generateTrendData(range) {
  let n = 24, fmt = i => `${(24-i).toString().padStart(2,'0')}:00`;
  if (range === 'weekly') { n = 7; fmt = i => { const d = new Date(); d.setDate(d.getDate()-i); return d.toLocaleDateString('en',{weekday:'short'}); }; }
  if (range === 'monthly') { n = 30; fmt = i => { const d = new Date(); d.setDate(d.getDate()-i); return d.toLocaleDateString('en',{month:'short',day:'numeric'}); }; }
  if (range === 'yearly') { n = 12; const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; fmt = i => months[(new Date().getMonth()-i+12)%12]; }
  const labels=[], soc=[], power=[], anomalies=[];
  for (let i = n-1; i >= 0; i--) {
    labels.push(fmt(i));
    soc.push(randBetween(35, 95));
    power.push(randBetween(-60, 80));
    anomalies.push(Math.random() > 0.88);
  }
  return { labels, soc, power, anomalies };
}

function renderTrendChart(range) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (trendChartInstance) trendChartInstance.destroy();
  const td = generateTrendData(range);

  const socPointBg = td.anomalies.map((a, i) => a ? '#D75B5B' : '#FF924C');
  const socPointR = td.anomalies.map(a => a ? 6 : 3);

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: td.labels,
      datasets: [
        {
          label: 'SOC (%)',
          data: td.soc,
          borderColor: '#FF924C',
          backgroundColor: 'rgba(255,146,76,0.07)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: socPointBg,
          pointRadius: socPointR,
          pointBorderColor: td.anomalies.map(a => a ? '#fff' : '#FF924C'),
          pointBorderWidth: td.anomalies.map(a => a ? 2 : 0),
          borderWidth: 2,
        },
        {
          label: 'Power (kW)',
          data: td.power,
          borderColor: '#5B8DD9',
          backgroundColor: 'rgba(91,141,217,0.06)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1',
          pointRadius: 2,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            afterBody: (items) => {
              const idx = items[0]?.dataIndex;
              return td.anomalies[idx] ? ['⚠ Anomaly detected'] : [];
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#E5E5E322' }, ticks: { color: '#6B6B6B', maxTicksLimit: 12, font: { family: 'DM Mono', size: 10 } } },
        y: { position: 'left', grid: { color: '#E5E5E3' }, ticks: { color: '#6B6B6B', font: { family: 'DM Mono', size: 10 }, callback: v => v + '%' } },
        y1: { position: 'right', grid: { display: false }, ticks: { color: '#5B8DD9', font: { family: 'DM Mono', size: 10 }, callback: v => v + 'kW' } }
      }
    }
  });
}

function setRange(range, el) {
  currentRange = range;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderTrendChart(range);
}

// ===================== HEATMAP =====================
function getCellClass(v) {
  if (v < 3.4 || v > 4.05) return 'cell-critical';
  if (v < 3.6 || v > 3.9) return 'cell-caution';
  return 'cell-efficient';
}
function getCellBg(v) {
  if (v < 3.4 || v > 4.05) return '#D75B5B';
  if (v < 3.6 || v > 3.9) return '#E0A25B';
  return '#A7B89C';
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-packs');
  if (!container) return;
  container.innerHTML = '';
  packData.forEach(pack => {
    const div = document.createElement('div');
    div.className = 'hm-pack';
    const critCount = pack.cells.filter(c => getCellClass(c.voltage) === 'cell-critical').length;
    div.innerHTML = `
      <div class="hm-pack-title">${pack.name} <span>${critCount > 0 ? critCount + ' critical cells' : 'All cells OK'}</span></div>
      <div class="cell-grid" id="grid-${pack.name.replace(' ','')}"></div>
    `;
    container.appendChild(div);
    const grid = div.querySelector('.cell-grid');
    pack.cells.forEach(cell => {
      const c = document.createElement('div');
      c.className = 'cell-block ' + getCellClass(cell.voltage);
      c.textContent = cell.voltage.toFixed(2);
      c.title = `${cell.id}: ${cell.voltage}V`;
      c.addEventListener('mouseenter', e => showCellTooltip(e, pack.name, cell));
      c.addEventListener('mouseleave', hideCellTooltip);
      grid.appendChild(c);
    });
  });
}

function showCellTooltip(e, packName, cell) {
  const t = document.getElementById('cell-tooltip');
  t.style.display = 'block';
  t.innerHTML = `<strong>${packName} — ${cell.id}</strong><br>Voltage: ${cell.voltage}V<br>Status: ${getCellClass(cell.voltage).replace('cell-','')}`;
  t.style.left = (e.clientX + 14) + 'px';
  t.style.top = (e.clientY - 10) + 'px';
}
function hideCellTooltip() {
  document.getElementById('cell-tooltip').style.display = 'none';
}

// ===================== BATTERY PACKS =====================
function statusClass(s) {
  return { Charging: 'status-charging', Discharging: 'status-discharging', Idle: 'status-idle', Online: 'status-online' }[s] || 'status-online';
}

function renderPacks() {
  const grid = document.getElementById('packs-grid');
  if (!grid) return;
  grid.innerHTML = '';
  packData.forEach(pack => {
    const card = document.createElement('div');
    card.className = 'pack-card';
    card.innerHTML = `
      <div class="pack-header">
        <div class="pack-name">${pack.name}</div>
        <span class="pack-status ${statusClass(pack.status)}">${pack.status}</span>
      </div>
      <div class="pack-metrics">
        <div class="pack-metric">
          <div class="pack-metric-label">Voltage</div>
          <div class="pack-metric-value">${pack.volt.toFixed(1)}<span class="pack-metric-unit"> V</span></div>
        </div>
        <div class="pack-metric">
          <div class="pack-metric-label">Current</div>
          <div class="pack-metric-value">${pack.curr.toFixed(1)}<span class="pack-metric-unit"> A</span></div>
        </div>
        <div class="pack-metric">
          <div class="pack-metric-label">Temperature</div>
          <div class="pack-metric-value" style="color:${pack.temp > 40 ? '#D75B5B' : '#1A1A1A'}">${pack.temp.toFixed(1)}<span class="pack-metric-unit"> °C</span></div>
        </div>
        <div class="pack-metric">
          <div class="pack-metric-label">Power</div>
          <div class="pack-metric-value" style="color:${pack.power >= 0 ? '#E0A25B' : '#5B8DD9'}">${pack.power >= 0 ? '+' : ''}${pack.power.toFixed(2)}<span class="pack-metric-unit"> kW</span></div>
        </div>
      </div>
      <div class="pack-soc-bar"><div class="pack-soc-fill" style="width:${pack.soc}%; background:${pack.soc > 70 ? 'linear-gradient(90deg,#A7B89C,#7BC67E)' : pack.soc > 40 ? 'linear-gradient(90deg,#E0A25B,#FF924C)' : 'linear-gradient(90deg,#D75B5B,#E0A25B)'}"></div></div>
      <div class="pack-soc-label"><span>SOC</span><span>${pack.soc.toFixed(1)}%</span></div>
    `;
    grid.appendChild(card);
  });
}

// ===================== ALERTS =====================
const ALERTS = [
  { id:'a1', severity:'critical', title:'Cell Over-Voltage Detected', description:'Pack 2 Cell S7 voltage exceeded 4.05V threshold. Immediate inspection required.', equipment:'Pack 2 — BMS', time: '12m ago', threshold:4.05, current:4.12 },
  { id:'a2', severity:'critical', title:'High Temperature Warning', description:'Pack 4 temperature reached 44°C. Cooling system may be underperforming.', equipment:'Pack 4 — Thermal Management', time: '28m ago', threshold:42, current:44 },
  { id:'a3', severity:'critical', title:'Pack 6 Communication Loss', description:'BMS communication with Pack 6 lost for 3 minutes. Reconnecting...', equipment:'Pack 6 — BMS/CAN Bus', time: '34m ago', threshold:0, current:0 },
  { id:'a4', severity:'warning', title:'SOC Imbalance Between Packs', description:'SOC deviation between Pack 1 and Pack 5 exceeds 15%. Cell balancing recommended.', equipment:'All Packs — BMS', time: '1h ago', threshold:10, current:15.4 },
  { id:'a5', severity:'warning', title:'PV Input Power Drop', description:'PV array input dropped 40% below expected output. Check for shading or inverter fault.', equipment:'PV Array — Inverter', time: '2h ago', threshold:20, current:12.3 },
  { id:'a6', severity:'info', title:'Scheduled Maintenance Due', description:'Pack 3 and Pack 5 are due for cell balancing and BMS firmware update.', equipment:'Pack 3, Pack 5 — BMS', time: '4h ago', threshold:0, current:0 },
];

const REPORTS = [
  {
    id:'r1', title:'BESS Efficiency Summary',
    summary:'Overall system efficiency at 91.4%, up 3.2% from last period.',
    details:['Pack 1 achieved highest efficiency at 94.2%','PV integration providing 28% of total energy','Charge/discharge cycle count within optimal range','Average cell voltage deviation: ±0.018V'],
    recs:['Maintain current charge scheduling for optimal longevity','Schedule Pack 2 cell balancing within 48h','Review PV inverter settings to improve yield','Consider adding active cooling to Pack 4'],
  },
  {
    id:'r2', title:'Cell Voltage Analysis',
    summary:'3 cells identified with voltage outside normal operating range.',
    details:['Pack 2 S7: 4.12V (critical — over voltage)','Pack 5 S12: 3.38V (caution — low voltage)','Pack 3 S4: 3.41V (caution — near threshold)','All other 93 cells within normal range (3.6–3.9V)'],
    recs:['Immediate passive balancing on Pack 2 S7','Monitor Pack 5 S12 closely over next 24h','Run full BMS diagnostic on Pack 3','Consider capacity test for aging cells'],
  },
  {
    id:'r3', title:'Energy Flow Report',
    summary:'Total 842 kWh cycled today. PV contribution: 236 kWh.',
    details:['Peak discharge: 87.4 kW at 14:32','Peak charge from PV: 24.1 kW at 11:15','Grid interaction: 12 charge events, 8 discharge events','Round-trip efficiency: 91.4%'],
    recs:['Optimize charge window to 10:00–14:00 for max PV usage','Implement demand response for peak grid pricing','Review discharge schedule against load forecast','Consider expanding PV capacity by 15%'],
  },
];

function severityIcon(sev) {
  const c = { critical: '#D75B5B', warning: '#E0A25B', info: '#FF924C' }[sev];
  return `<svg class="alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2">
    ${sev === 'critical' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' :
      sev === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' :
      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>'}
  </svg>`;
}

function renderAlerts() {
  const list = document.getElementById('alerts-list');
  if (!list) return;
  list.innerHTML = '';
  ALERTS.forEach(a => {
    const item = document.createElement('div');
    item.className = 'alert-item';
    const hasThresh = a.threshold > 0;
    item.innerHTML = `
      <div class="alert-trigger" onclick="toggleExpand('ae-${a.id}')">
        ${severityIcon(a.severity)}
        <div class="alert-body">
          <div class="alert-title">${a.title}</div>
          <div class="alert-equipment">${a.equipment}</div>
          <div class="alert-time">${a.time}</div>
        </div>
        <span class="alert-badge badge-${a.severity}">${a.severity}</span>
      </div>
      <div class="alert-expand" id="ae-${a.id}">
        <p>${a.description}</p>
        ${hasThresh ? `
        <div class="alert-thresholds">
          <div class="thresh-item"><div class="thresh-label">Threshold</div><div class="thresh-value">${a.threshold}</div></div>
          <div class="thresh-item"><div class="thresh-label">Current</div><div class="thresh-value" style="color:#D75B5B">${a.current}</div></div>
          <div class="thresh-item"><div class="thresh-label">Deviation</div><div class="thresh-value" style="color:#D75B5B">+${(((a.current-a.threshold)/a.threshold)*100).toFixed(1)}%</div></div>
        </div>` : ''}
      </div>
    `;
    list.appendChild(item);
  });

  const rList = document.getElementById('reports-list');
  if (!rList) return;
  rList.innerHTML = '';
  REPORTS.forEach(r => {
    const item = document.createElement('div');
    item.className = 'report-item';
    item.innerHTML = `
      <div class="report-trigger" onclick="toggleExpand('re-${r.id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF924C" stroke-width="2" style="flex-shrink:0;margin-top:1px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <div class="report-body">
          <div class="report-title">${r.title}</div>
          <div class="report-summary">${r.summary}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" stroke-width="2" style="flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="report-expand" id="re-${r.id}">
        <div class="report-section">
          <div class="report-section-title">Key Findings</div>
          <ul class="report-ul">${r.details.map(d=>`<li>${d}</li>`).join('')}</ul>
        </div>
        <div class="report-section">
          <div class="report-section-title">Recommendations</div>
          <ul class="report-ul">${r.recs.map(rec=>`<li>${rec}</li>`).join('')}</ul>
        </div>
      </div>
    `;
    rList.appendChild(item);
  });
}

function toggleExpand(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ===================== FILTERS =====================
function applyFilters() {
  const pack = document.getElementById('pack-filter').value;
  const filtered = pack === 'All' ? packData : packData.filter(p => p.name === pack);
  const kpis = aggregateKPIs(filtered);
  updateKPIs(kpis);
  if (socBarChartInstance) {
    socBarChartInstance.data.datasets[0].data = filtered.map(d => d.soc);
    socBarChartInstance.data.labels = filtered.map(d => d.name);
    socBarChartInstance.update();
  }
}

// ===================== LIVE UPDATE =====================
function liveUpdate() {
  packData = generatePackData();
  const kpis = aggregateKPIs(packData);
  updateKPIs(kpis);

  // Push new point to power chart
  const now = new Date();
  const label = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
  powerChartData.labels.push(label);
  powerChartData.charge.push(randBetween(-80, 80));
  powerChartData.pv.push(randBetween(5, 25));
  powerChartData.load.push(randBetween(10, 50));
  if (powerChartData.labels.length > realtimePoints) {
    powerChartData.labels.shift();
    powerChartData.charge.shift();
    powerChartData.pv.shift();
    powerChartData.load.shift();
  }
  if (powerChartInstance) {
    powerChartInstance.data.labels = [...powerChartData.labels];
    powerChartInstance.data.datasets[0].data = [...powerChartData.charge];
    powerChartInstance.data.datasets[1].data = [...powerChartData.pv];
    powerChartInstance.data.datasets[2].data = [...powerChartData.load];
    powerChartInstance.update('none');
  }
  if (socBarChartInstance) {
    socBarChartInstance.data.datasets[0].data = packData.map(d => d.soc);
    socBarChartInstance.update('none');
  }

  // Re-render heatmap if visible
  const hmTab = document.getElementById('tab-heatmap');
  if (hmTab && hmTab.classList.contains('active')) renderHeatmap();

  // Re-render packs if visible
  const pkTab = document.getElementById('tab-devices');
  if (pkTab && pkTab.classList.contains('active')) renderPacks();
}

// ===================== INIT =====================
function initDashboard() {
  loadChartJS(() => {
    const kpis = aggregateKPIs(packData);
    updateKPIs(kpis);
    renderPowerChart();
    renderSocBarChart();
    renderHeatmap();
    renderPacks();
    renderAlerts();
    setInterval(liveUpdate, 3000);
  });
}

// Show toast helper
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
