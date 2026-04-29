/* ══════════════════════════════════════
   EMS — script.js
══════════════════════════════════════ */

// ── AUTH ──────────────────────────────
const USERS = {
  'admin':   'admin123',
  'sodion':  'sodion123',
  'device1': 'pass1',
};

function login() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const err  = document.getElementById('login-error');

  if (USERS[user] && USERS[user] === pass) {
    err.classList.add('hidden');
    document.getElementById('display-name').textContent = user.charAt(0).toUpperCase() + user.slice(1);
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
}

// Allow Enter key on login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-page').classList.contains('active')) {
    login();
  }
});

// ── NAVIGATION ────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');

  const titles = { overview: 'System Overview', devices: 'All Devices', analytics: 'Analytics', alerts: 'Alerts & Events' };
  document.getElementById('section-title').textContent = titles[name] || name;

  // find clicked nav button
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.getAttribute('onclick') === `showSection('${name}')`) b.classList.add('active');
  });

  if (name === 'analytics') initAnalyticsCharts();
}

// ── CLOCK ─────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;
}

// ── DEVICE DATA ───────────────────────
const DEVICE_COUNT = 6;

function makeDevice(i) {
  const online = i < 6; // all online for demo
  return {
    id: i + 1,
    name: `BESS-${String(i + 1).padStart(2, '0')}`,
    online,
    soc:     rand(60, 95),
    voltage: rand(460, 510, 1),
    current: rand(20, 35, 1),
    power:   rand(9, 18, 1),
    temp:    rand(28, 42, 1),
    cells:   Array.from({ length: 16 }, () => rand(3.2, 3.65, 3)),
  };
}

let devices = Array.from({ length: DEVICE_COUNT }, (_, i) => makeDevice(i));

function rand(min, max, dec = 0) {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(dec));
}

function updateDeviceData() {
  devices.forEach(d => {
    if (!d.online) return;
    d.soc     = clamp(d.soc     + rand(-0.5, 0.5, 1), 0, 100);
    d.voltage = clamp(d.voltage + rand(-2,   2,   1), 440, 520);
    d.current = clamp(d.current + rand(-1,   1,   1), 10, 50);
    d.power   = parseFloat((d.voltage * d.current / 1000).toFixed(1));
    d.temp    = clamp(d.temp    + rand(-0.3, 0.3, 1), 20, 60);
    d.cells   = d.cells.map(c => clamp(c + rand(-0.01, 0.01, 3), 3.0, 3.7));
  });
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ── SUMMARY CARDS ─────────────────────
function updateSummaryCards() {
  const online = devices.filter(d => d.online);
  const avgSoc = (online.reduce((a, d) => a + d.soc, 0) / online.length).toFixed(1);
  const totalV = (online.reduce((a, d) => a + d.voltage, 0) / online.length).toFixed(1);
  const totalI = online.reduce((a, d) => a + d.current, 0).toFixed(1);
  const totalP = online.reduce((a, d) => a + d.power, 0).toFixed(1);
  const avgT   = (online.reduce((a, d) => a + d.temp, 0) / online.length).toFixed(1);

  document.getElementById('total-soc').textContent     = avgSoc;
  document.getElementById('total-voltage').textContent = totalV;
  document.getElementById('total-current').textContent = totalI;
  document.getElementById('total-power').textContent   = totalP;
  document.getElementById('avg-temp').textContent      = avgT;
  document.getElementById('devices-online').textContent= online.length;
  document.getElementById('soc-bar').style.width       = avgSoc + '%';
}

// ── POWER CHART ───────────────────────
let powerChart, socChart;
const powerHistory = { labels: [], data: [] };

function initPowerChart() {
  const ctx = document.getElementById('powerChart').getContext('2d');
  for (let i = 60; i > 0; i--) {
    powerHistory.labels.push('');
    powerHistory.data.push(rand(55, 75, 1));
  }

  powerChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: powerHistory.labels,
      datasets: [{
        data: powerHistory.data,
        borderColor: '#388bfd',
        backgroundColor: 'rgba(56,139,253,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e', font: { family: 'Share Tech Mono', size: 11 } },
        }
      }
    }
  });
}

function updatePowerChart() {
  const totalP = devices.filter(d => d.online).reduce((a, d) => a + d.power, 0);
  powerHistory.labels.push('');
  powerHistory.data.push(parseFloat(totalP.toFixed(1)));
  if (powerHistory.labels.length > 60) {
    powerHistory.labels.shift();
    powerHistory.data.shift();
  }
  powerChart.update();
}

// ── SOC BAR CHART ─────────────────────
function initSocChart() {
  const ctx = document.getElementById('socChart').getContext('2d');
  socChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: devices.map(d => d.name),
      datasets: [{
        data: devices.map(d => d.soc),
        backgroundColor: devices.map(d => d.soc > 70 ? '#3fb950' : d.soc > 40 ? '#f0883e' : '#f85149'),
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8b949e', font: { family: 'Share Tech Mono', size: 10 } }, grid: { display: false } },
        y: {
          min: 0, max: 100,
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e', font: { family: 'Share Tech Mono', size: 11 }, callback: v => v + '%' }
        }
      }
    }
  });
}

function updateSocChart() {
  socChart.data.datasets[0].data = devices.map(d => d.soc);
  socChart.data.datasets[0].backgroundColor = devices.map(d =>
    d.soc > 70 ? '#3fb950' : d.soc > 40 ? '#f0883e' : '#f85149'
  );
  socChart.update();
}

// ── DEVICE CARDS ──────────────────────
function renderDeviceCards() {
  const grid = document.getElementById('devices-grid');
  grid.innerHTML = '';
  devices.forEach(d => {
    const socColor = d.soc > 70 ? '#3fb950' : d.soc > 40 ? '#f0883e' : '#f85149';
    const card = document.createElement('div');
    card.className = 'device-card' + (d.online ? '' : ' offline');
    card.id = 'dev-card-' + d.id;
    card.innerHTML = `
      <div class="device-header">
        <div class="device-name">${d.name}</div>
        <div class="device-status ${d.online ? 'online' : 'offline'}">${d.online ? 'ONLINE' : 'OFFLINE'}</div>
      </div>
      <div class="device-metrics">
        <div class="metric">
          <div class="metric-label">SOC</div>
          <div class="metric-value" id="d${d.id}-soc">${d.soc}<span style="font-size:13px;color:#8b949e">%</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">VOLTAGE</div>
          <div class="metric-value" id="d${d.id}-v">${d.voltage}<span style="font-size:13px;color:#8b949e">V</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">CURRENT</div>
          <div class="metric-value" id="d${d.id}-i">${d.current}<span style="font-size:13px;color:#8b949e">A</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">TEMPERATURE</div>
          <div class="metric-value" id="d${d.id}-t">${d.temp}<span style="font-size:13px;color:#8b949e">°C</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">POWER</div>
          <div class="metric-value" id="d${d.id}-p">${d.power}<span style="font-size:13px;color:#8b949e">kW</span></div>
        </div>
      </div>
      <div class="device-soc-bar">
        <div class="device-soc-fill" id="d${d.id}-sbar" style="width:${d.soc}%;background:${socColor}"></div>
      </div>
      <div class="cell-voltages" id="d${d.id}-cells">${renderCells(d.cells)}</div>
    `;
    grid.appendChild(card);
  });
}

function renderCells(cells) {
  return cells.map(c => {
    const pct = ((c - 3.0) / 0.7) * 100;
    const color = pct > 70 ? '#3fb950' : pct > 40 ? '#f0883e' : '#f85149';
    return `<div class="cell-bar" title="${c}V"><div class="cell-bar-fill" style="height:${pct}%;background:${color}"></div></div>`;
  }).join('');
}

function updateDeviceCards() {
  devices.forEach(d => {
    if (!d.online) return;
    const socColor = d.soc > 70 ? '#3fb950' : d.soc > 40 ? '#f0883e' : '#f85149';
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.childNodes[0].nodeValue = val; };
    const el = id => document.getElementById(id);

    if (el(`d${d.id}-soc`)) el(`d${d.id}-soc`).childNodes[0].nodeValue = d.soc;
    if (el(`d${d.id}-v`))   el(`d${d.id}-v`).childNodes[0].nodeValue   = d.voltage;
    if (el(`d${d.id}-i`))   el(`d${d.id}-i`).childNodes[0].nodeValue   = d.current;
    if (el(`d${d.id}-t`))   el(`d${d.id}-t`).childNodes[0].nodeValue   = d.temp;
    if (el(`d${d.id}-p`))   el(`d${d.id}-p`).childNodes[0].nodeValue   = d.power;
    if (el(`d${d.id}-sbar`)) { el(`d${d.id}-sbar`).style.width = d.soc + '%'; el(`d${d.id}-sbar`).style.background = socColor; }
    if (el(`d${d.id}-cells`)) el(`d${d.id}-cells`).innerHTML = renderCells(d.cells);
  });
}

// ── ANALYTICS CHARTS ──────────────────
let voltChart, tmpChart, analyticsInited = false;
const COLORS = ['#388bfd','#3fb950','#f0883e','#f85149','#bc8cff','#39d353'];

const voltHistory = devices.map(() => Array.from({ length: 60 }, () => rand(460, 510, 1)));
const tempHistory = devices.map(() => Array.from({ length: 60 }, () => rand(28, 42, 1)));
const timeLabels  = Array.from({ length: 60 }, (_, i) => '');

function initAnalyticsCharts() {
  if (analyticsInited) return;
  analyticsInited = true;

  voltChart = new Chart(document.getElementById('voltageChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: [...timeLabels],
      datasets: devices.map((d, i) => ({
        label: d.name,
        data: [...voltHistory[i]],
        borderColor: COLORS[i],
        borderWidth: 1.5,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
      }))
    },
    options: analyticsOpts('V')
  });

  tmpChart = new Chart(document.getElementById('tempChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: [...timeLabels],
      datasets: devices.map((d, i) => ({
        label: d.name,
        data: [...tempHistory[i]],
        borderColor: COLORS[i],
        borderWidth: 1.5,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
      }))
    },
    options: analyticsOpts('°C')
  });
}

function analyticsOpts(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: {
        labels: { color: '#8b949e', font: { family: 'Share Tech Mono', size: 11 }, boxWidth: 12 }
      }
    },
    scales: {
      x: { display: false },
      y: {
        grid: { color: '#21262d' },
        ticks: { color: '#8b949e', font: { family: 'Share Tech Mono', size: 11 }, callback: v => v + unit }
      }
    }
  };
}

function updateAnalyticsCharts() {
  if (!analyticsInited) return;
  devices.forEach((d, i) => {
    voltHistory[i].push(d.voltage); voltHistory[i].shift();
    tempHistory[i].push(d.temp);    tempHistory[i].shift();
    voltChart.data.datasets[i].data = [...voltHistory[i]];
    tmpChart.data.datasets[i].data  = [...tempHistory[i]];
  });
  voltChart.update();
  tmpChart.update();
}

// ── ALERTS ────────────────────────────
const ALERTS = [
  { type: 'warn',  icon: '⚠️', title: 'High Temperature — BESS-03', desc: 'Temperature exceeded 40°C threshold. Current: 41.2°C', time: '2 minutes ago' },
  { type: 'error', icon: '🔴', title: 'Low SOC Warning — BESS-05',  desc: 'State of Charge dropped below 20%. Immediate attention required.', time: '8 minutes ago' },
  { type: 'info',  icon: 'ℹ️', title: 'BESS-01 reconnected',        desc: 'Device came back online after 12 seconds of disconnection.', time: '15 minutes ago' },
  { type: 'info',  icon: 'ℹ️', title: 'System started',             desc: 'EMS monitoring system initialized successfully.', time: '1 hour ago' },
];

function renderAlerts() {
  const list = document.getElementById('alerts-list');
  list.innerHTML = ALERTS.map(a => `
    <div class="alert-item ${a.type}">
      <div class="alert-icon">${a.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
        <div class="alert-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

// ── INIT & LOOP ───────────────────────
function initDashboard() {
  updateSummaryCards();
  initPowerChart();
  initSocChart();
  renderDeviceCards();
  renderAlerts();
  startLoop();
}

function tick() {
  updateDeviceData();
  updateSummaryCards();
  updatePowerChart();
  updateSocChart();
  updateDeviceCards();
  updateAnalyticsCharts();
}

let loopInterval = null;
function startLoop() {
  if (loopInterval) clearInterval(loopInterval);
  loopInterval = setInterval(tick, 2000);
}

// Clock always runs
setInterval(updateClock, 1000);
updateClock();
