const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ─── Mock Data Generator ──────────────────────────────────────────────────────

const departments = ['All', 'Production', 'Warehouse', 'Office', 'HVAC', 'Lighting'];
const timePeriods = ['Today', 'This Week', 'This Month', 'This Year'];
const locations = ['Building A', 'Building B', 'Building C'];

const departmentEquipmentMap = {
  'All': ['All Equipment', 'Motors', 'Chillers', 'Compressors', 'Lighting Systems', 'Pumps', 'HVAC Units', 'Computers', 'Conveyors', 'Forklifts'],
  'Production': ['All Equipment', 'Motors', 'Compressors', 'Pumps', 'Conveyors'],
  'Warehouse': ['All Equipment', 'Lighting Systems', 'Forklifts', 'Conveyors', 'HVAC Units'],
  'Office': ['All Equipment', 'Lighting Systems', 'HVAC Units', 'Computers'],
  'HVAC': ['All Equipment', 'Chillers', 'HVAC Units', 'Pumps'],
  'Lighting': ['All Equipment', 'Lighting Systems'],
};

function generateTimeSeriesData(hours, days = 1) {
  const data = [];
  const now = new Date();
  const deptConfig = [
    { dept: 'Production', systems: ['Motors', 'Compressors', 'Pumps', 'Conveyors'] },
    { dept: 'Warehouse', systems: ['Lighting Systems', 'Forklifts', 'Conveyors', 'HVAC Units'] },
    { dept: 'Office', systems: ['Lighting Systems', 'HVAC Units', 'Computers'] },
    { dept: 'HVAC', systems: ['Chillers', 'HVAC Units', 'Pumps'] },
    { dept: 'Lighting', systems: ['Lighting Systems'] },
  ];
  const locs = ['Building A', 'Building B', 'Building C'];
  const locationMultipliers = { 'Building A': 1.3, 'Building B': 1.0, 'Building C': 0.8 };

  for (let d = days - 1; d >= 0; d--) {
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - (d * 86400000) - (i * 3600000));
      const hour = time.getHours();
      deptConfig.forEach(({ dept, systems }) => {
        systems.forEach(system => {
          locs.forEach(location => {
            const base = 150 + Math.random() * 100;
            const peak = (hour >= 9 && hour <= 17) ? 1.5 : 1;
            const locMult = locationMultipliers[location];
            const consumption = base * peak * locMult + (Math.random() * 50 - 25);
            data.push({
              timestamp: time.toISOString(),
              hour: `${hour.toString().padStart(2, '0')}:00`,
              consumption: Math.round(consumption),
              department: dept,
              system,
              location,
            });
          });
        });
      });
    }
  }
  return data;
}

const allTimeData = generateTimeSeriesData(24, 365);

function filterData(data, department, equipment, period, location) {
  const now = new Date();
  let startTime = new Date();
  if (period === 'Today') startTime = new Date(now - 86400000);
  else if (period === 'This Week') startTime = new Date(now - 7 * 86400000);
  else if (period === 'This Month') startTime = new Date(now - 30 * 86400000);
  else startTime = new Date(now - 365 * 86400000);

  return data.filter(item => {
    const d = new Date(item.timestamp);
    return (department === 'All' || item.department === department)
      && (equipment === 'All Equipment' || item.system === equipment)
      && d >= startTime
      && (!location || item.location === location);
  });
}

function calculateKPIs(data) {
  const total = data.reduce((s, i) => s + i.consumption, 0);
  const peak = data.length ? Math.max(...data.map(i => i.consumption)) : 0;
  return {
    totalEnergy: Math.round(total),
    peakConsumption: Math.round(peak),
    avgEfficiency: Math.round(75 + Math.random() * 15),
    cost: Math.round(total * 0.12),
    energySaved: Math.round(total * 0.18),
  };
}

function getDepartmentConsumption(data) {
  const grouped = {};
  data.forEach(item => {
    if (!grouped[item.department]) grouped[item.department] = { total: 0, count: 0 };
    grouped[item.department].total += item.consumption;
    grouped[item.department].count++;
  });
  return Object.entries(grouped).map(([name, { total }]) => ({
    name,
    consumption: Math.round(total),
    efficiency: Math.round(75 + Math.random() * 20),
  }));
}

function generateHeatMapZones() {
  const areas = ['Floor 1', 'Floor 2', 'Floor 3'];
  const equipment = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F'];
  const locs = ['Building A', 'Building B', 'Building C'];
  const zones = [];
  let id = 0;
  areas.forEach((area, ai) => {
    for (let i = 0; i < 6; i++) {
      const consumption = 100 + Math.random() * 400;
      const status = consumption > 400 ? 'high' : consumption > 250 ? 'caution' : 'efficient';
      zones.push({
        id: `zone-${id++}`,
        name: equipment[i],
        area,
        consumption: Math.round(consumption),
        efficiency: Math.round(60 + Math.random() * 35),
        status,
        x: (i % 3) * 33.33,
        y: ai * 33.33,
        width: 33.33,
        height: 33.33,
        location: locs[ai % locs.length],
      });
    }
  });
  return zones;
}

function generateTrendData(range) {
  let points = 24, format = 'hour';
  if (range === 'weekly') { points = 7; format = 'day'; }
  if (range === 'monthly') { points = 30; format = 'day'; }
  if (range === 'yearly') { points = 12; format = 'month'; }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from({ length: points }, (_, idx) => {
    const i = points - 1 - idx;
    let date;
    if (format === 'hour') date = `${(24 - i).toString().padStart(2,'0')}:00`;
    else if (format === 'day') {
      const d = new Date(); d.setDate(d.getDate() - i);
      date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else date = months[(12 - i) % 12];
    const isAnomaly = Math.random() > 0.85;
    return {
      date,
      consumption: Math.round(2000 + Math.random() * 1000),
      efficiency: Math.round(70 + Math.random() * 20),
      isAnomaly,
      anomalyReason: isAnomaly ? 'Unexpected spike in consumption detected' : null,
    };
  });
}

function generateAlerts() {
  return [
    { id:'a1', severity:'critical', title:'Critical Consumption Threshold Exceeded', description:'Chiller Unit #3 exceeded maximum consumption threshold by 45%', equipment:'Chiller Unit #3 - Building A', timestamp: new Date(Date.now()-900000).toISOString(), threshold:500, currentValue:725 },
    { id:'a2', severity:'warning', title:'Efficiency Drop Detected', description:'Production motors showing 15% efficiency decline over past 6 hours', equipment:'Motor Array #2 - Production Floor', timestamp: new Date(Date.now()-2700000).toISOString(), threshold:85, currentValue:72 },
    { id:'a3', severity:'critical', title:'Peak Demand Alert', description:'Building B approaching peak demand limit during business hours', equipment:'Building B - Main Grid', timestamp: new Date(Date.now()-7200000).toISOString(), threshold:3000, currentValue:2850 },
    { id:'a4', severity:'warning', title:'Unusual Pattern Detected', description:'Office HVAC running at high capacity during off-hours', equipment:'HVAC System - Office Wing', timestamp: new Date(Date.now()-10800000).toISOString(), threshold:200, currentValue:285 },
    { id:'a5', severity:'info', title:'Maintenance Reminder', description:'Scheduled maintenance due for lighting systems in Warehouse', equipment:'Lighting Control - Warehouse', timestamp: new Date(Date.now()-14400000).toISOString(), threshold:0, currentValue:0 },
  ];
}

function generateReports() {
  return [
    { id:'r1', title:'Energy Efficiency Summary', summary:'Overall facility efficiency at 82%, exceeding target by 7%', details:['Production area achieved 88% efficiency, highest in 6 months','Office wing improved by 12% through HVAC optimization','Warehouse lighting retrofit reduced consumption by 23%','Total energy savings: 4,250 kWh this month'], recommendations:['Maintain current HVAC schedules for optimal performance','Consider extending lighting retrofit to production areas','Schedule equipment calibration for Motor Array #2'] },
    { id:'r2', title:'High Consumption Areas', summary:'Three zones identified with consumption above acceptable thresholds', details:['Chiller Unit #3: Running 18 hours/day vs 12 hour target','Building B Grid: Peak demand 95% of capacity limit','Production Motors: 15% higher consumption vs baseline','Combined excess: 1,840 kWh/day above target'], recommendations:['Immediate inspection of Chiller Unit #3 for mechanical issues','Implement staggered start times for Building B equipment','Review production motor loads and consider load balancing','Install additional monitoring on high-consumption zones'] },
    { id:'r3', title:'Cost Analysis & Projections', summary:'Current monthly costs trending $3,200 below budget', details:['Average cost per kWh: $0.12 (2% lower than projected)','Monthly savings from efficiency improvements: $2,450','Peak demand charges reduced by 18% vs last quarter','Projected annual savings: $28,600 at current rate'], recommendations:['Allocate savings toward additional energy monitoring equipment','Invest in preventive maintenance program for critical equipment','Consider renewable energy options for Building A','Implement demand response program for peak hours'] },
  ];
}

// ─── API Router ───────────────────────────────────────────────────────────────

function handleAPI(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const params = url.searchParams;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const dept = params.get('department') || 'All';
  const equipment = params.get('equipment') || 'All Equipment';
  const period = params.get('period') || 'Today';
  const location = params.get('location') || '';
  const range = params.get('range') || 'daily';

  if (url.pathname === '/api/dashboard') {
    const filtered = filterData(allTimeData, dept, equipment, period, location);
    res.end(JSON.stringify({
      kpis: calculateKPIs(filtered),
      chartData: (() => {
        const agg = {};
        filtered.forEach(item => {
          if (!agg[item.hour]) agg[item.hour] = { hour: item.hour, consumption: 0, count: 0 };
          agg[item.hour].consumption += item.consumption;
          agg[item.hour].count++;
        });
        return Object.values(agg).map(d => ({ hour: d.hour, consumption: Math.round(d.consumption / d.count) })).sort((a,b) => a.hour.localeCompare(b.hour));
      })(),
      departmentData: getDepartmentConsumption(filtered),
    }));
  } else if (url.pathname === '/api/heatmap') {
    res.end(JSON.stringify(generateHeatMapZones()));
  } else if (url.pathname === '/api/trends') {
    res.end(JSON.stringify(generateTrendData(range)));
  } else if (url.pathname === '/api/alerts') {
    res.end(JSON.stringify(generateAlerts()));
  } else if (url.pathname === '/api/reports') {
    res.end(JSON.stringify(generateReports()));
  } else if (url.pathname === '/api/meta') {
    res.end(JSON.stringify({ departments, timePeriods, locations, departmentEquipmentMap }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

// ─── Static File Server ───────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) return handleAPI(req, res);

  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mime = mimeTypes[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', mime);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`⚡ Energy Dashboard running at http://localhost:${PORT}`);
});
