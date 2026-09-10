/* ═══════════════════════════════════════════
   EMS — script.js
═══════════════════════════════════════════ */

const supabaseUrl = "https://xfozfhopqxokmdcgyhqy.supabase.co";

const supabaseKey = "sb_publishable_yx3wAYXNdfYo8HwrmDUryQ_idY6gR7z";

const db = supabase.createClient(
    supabaseUrl,
    supabaseKey
);


// ═══════════════════════════════════════════
// BMS DATA
// ═══════════════════════════════════════════

async function getBMSData()
{
    const { data, error } = await db
        .from("BMS_Data")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

    if(error)
    {
        console.log(error);
        return;
    }

    if(!data || data.length === 0)
        return;

    let latest = data[0];

    document.getElementById("kpi-soc").innerHTML =
        latest.Soc;

    document.getElementById("kpi-voltage").innerHTML =
        latest.Voltage;

    document.getElementById("kpi-current").innerHTML =
        latest.Current;

    document.getElementById("kpi-temp").innerHTML =
        latest.Temperature;

    document.getElementById("kpi-pv").innerHTML =
        latest.Pv_power;

    document.getElementById("kpi-power").innerHTML =
        latest.Power;


    RAW_DATA = data.map(row => ({
        hour: new Date(row.created_at).getHours() + ":00",

        // Current BMS table represents the overall system.
        pack: "Pack 1",

        soc: Number(row.Soc) || 0,
        voltage: Number(row.Voltage) || 0,
        current: Number(row.Current) || 0,
        power: Number(row.Power) || 0,
        temp: Number(row.Temperature) || 0,
        pv: Number(row.Pv_power) || 0
    }));


    updateKPIs();
    buildLineChart();
    buildBarChart();
    buildHeatmap();
}


// Update every 5 seconds
getBMSData();

setInterval(getBMSData, 5000);


// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════

const USERS = {
    admin: 'admin123',
    sodion: 'sodion123',
    operator: 'op2024'
};


function login()
{
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value;

    const err = document.getElementById('login-error');

    if (USERS[u] && USERS[u] === p)
    {
        err.classList.add('hidden');

        document.getElementById('user-chip').textContent =
            u[0].toUpperCase();

        document.getElementById('login-page').classList.remove('active');

        document.getElementById('dashboard-page').classList.add('active');

        initDashboard();
    }
    else
    {
        err.classList.remove('hidden');
    }
}


function logout()
{
    document.getElementById('dashboard-page').classList.remove('active');

    document.getElementById('login-page').classList.add('active');

    document.getElementById('username').value = '';

    document.getElementById('password').value = '';

    destroyCharts();
}


document.addEventListener('keydown', e =>
{
    if (
        e.key === 'Enter' &&
        document.getElementById('login-page').classList.contains('active')
    )
    {
        login();
    }
});


// ═══════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════

setInterval(() =>
{
    const n = new Date();

    const pad = v =>
        String(v).padStart(2, '0');

    document.getElementById('clock').textContent =
        `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;

}, 1000);


// ═══════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════

function switchTab(name, btn)
{
    document
        .querySelectorAll('.tab-panel')
        .forEach(p => p.classList.add('hidden'));

    document
        .querySelectorAll('.tab')
        .forEach(b => b.classList.remove('active'));

    document
        .getElementById('tab-' + name)
        .classList.remove('hidden');

    if(btn)
        btn.classList.add('active');

    if(name === 'trends')
        buildTrendChart(currentRange);

    if(name === 'heatmap')
        buildHeatmap();
}


// ═══════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════

let selectedLocation = '';


function onFilterChange()
{
    updateKPIs();

    buildLineChart();

    buildBarChart();

    // IMPORTANT:
    // Rebuild heatmap when Pack selection changes.
    buildHeatmap();
}


function clearLocation()
{
    selectedLocation = '';

    document
        .getElementById('loc-pill')
        .classList.add('hidden');

    onFilterChange();
}


function setLocation(loc)
{
    selectedLocation = loc;

    document.getElementById('loc-label').textContent = loc;

    document
        .getElementById('loc-pill')
        .classList.remove('hidden');

    showToast(`Filter Applied: ${loc}`);

    onFilterChange();
}


// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════

let RAW_DATA = [];


function getFiltered()
{
    const pack =
        document.getElementById('sel-pack')?.value || 'All Packs';

    return RAW_DATA.filter(d =>
        pack === 'All Packs' || d.pack === pack
    );
}


// ═══════════════════════════════════════════
// KPI CALCULATIONS
// ═══════════════════════════════════════════

function calcKPIs(data)
{
    if(!data || data.length === 0)
    {
        return {
            soc: 0,
            voltage: 0,
            current: 0,
            temp: 0,
            power: 0,
            pv: 0
        };
    }

    const avgSOC =
        data.reduce((s,d) => s + d.soc, 0) / data.length;

    const avgVoltage =
        data.reduce((s,d) => s + d.voltage, 0) / data.length;

    const avgCurrent =
        data.reduce((s,d) => s + d.current, 0) / data.length;

    const avgTemp =
        data.reduce((s,d) => s + d.temp, 0) / data.length;

    const avgPower =
        data.reduce((s,d) => s + d.power, 0) / data.length;

    const avgPV =
        data.reduce((s,d) => s + d.pv, 0) / data.length;

    return {
        soc: avgSOC,
        voltage: avgVoltage,
        current: avgCurrent,
        temp: avgTemp,
        power: avgPower,
        pv: avgPV
    };
}


// ═══════════════════════════════════════════
// KPI CARDS
// ═══════════════════════════════════════════

function animateValue(id, target)
{
    const el = document.getElementById(id);

    if(!el)
        return;

    if(!Number.isFinite(target))
        target = 0;

    let current = 0;

    const step = target / 40;

    const iv = setInterval(() =>
    {
        current += step;

        if(
            (step >= 0 && current >= target) ||
            (step < 0 && current <= target)
        )
        {
            el.textContent = target.toFixed(1);

            clearInterval(iv);
        }
        else
        {
            el.textContent = current.toFixed(1);
        }

    }, 25);
}


function updateKPIs()
{
    const kpis = calcKPIs(getFiltered());

    animateValue('kpi-soc', kpis.soc);

    animateValue('kpi-voltage', kpis.voltage);

    animateValue('kpi-current', kpis.current);

    animateValue('kpi-temp', kpis.temp);

    animateValue('kpi-power', Math.abs(kpis.power));

    animateValue('kpi-pv', kpis.pv);


    const currTrend =
        document.getElementById('kpi-current-trend');

    const powTrend =
        document.getElementById('kpi-power-trend');


    if(kpis.current > 0)
    {
        currTrend.textContent = 'Charging';
        currTrend.className = 'kpi-trend up';

        powTrend.textContent = 'Charging';
        powTrend.className = 'kpi-trend up';
    }
    else
    {
        currTrend.textContent = 'Discharging';
        currTrend.className = 'kpi-trend down';

        powTrend.textContent = 'Discharging';
        powTrend.className = 'kpi-trend down';
    }
}


// ═══════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════

let lineChart = null;
let barChart = null;
let trendChart = null;


function destroyCharts()
{
    [lineChart, barChart, trendChart].forEach(c =>
    {
        if(c)
            c.destroy();
    });

    lineChart = null;
    barChart = null;
    trendChart = null;
}


const CHART_DEFAULTS =
{
    responsive: true,

    maintainAspectRatio: true,

    plugins:
    {
        legend:
        {
            labels:
            {
                font:
                {
                    family: 'Inter',
                    size: 11
                },

                color: '#6B6B6B',

                boxWidth: 12
            }
        }
    },

    scales:
    {
        x:
        {
            grid:
            {
                color: '#E0E0E0'
            },

            ticks:
            {
                font:
                {
                    family: 'Inter',
                    size: 11
                },

                color: '#6B6B6B'
            }
        },

        y:
        {
            grid:
            {
                color: '#E0E0E0'
            },

            ticks:
            {
                font:
                {
                    family: 'Inter',
                    size: 11
                },

                color: '#6B6B6B'
            }
        }
    }
};


// ═══════════════════════════════════════════
// LINE CHART
// ═══════════════════════════════════════════

function buildLineChart()
{
    const data = getFiltered();

    const byHour = {};


    data.forEach(d =>
    {
        if(!byHour[d.hour])
        {
            byHour[d.hour] =
            {
                power: 0,
                pv: 0,
                count: 0
            };
        }

        byHour[d.hour].power += d.power;

        byHour[d.hour].pv += d.pv;

        byHour[d.hour].count++;
    });


    const labels =
        Object.keys(byHour).sort();


    const powerVals =
        labels.map(l =>
            byHour[l].power / byHour[l].count
        );


    const pvVals =
        labels.map(l =>
            byHour[l].pv / byHour[l].count
        );


    const ctx =
        document.getElementById('lineChart');

    if(!ctx)
        return;


    if(lineChart)
        lineChart.destroy();


    lineChart = new Chart(ctx,
    {
        type: 'line',

        data:
        {
            labels,

            datasets:
            [
                {
                    label: 'Charge/Discharge Power (kW)',

                    data: powerVals,

                    borderColor: '#FF924C',

                    backgroundColor:
                        'rgba(255,146,76,0.08)',

                    borderWidth: 2,

                    fill: true,

                    tension: 0.4,

                    pointRadius: 3,

                    pointBackgroundColor: '#FF924C'
                },

                {
                    label: 'PV Input (kW)',

                    data: pvVals,

                    borderColor: '#3FB950',

                    backgroundColor:
                        'rgba(63,185,80,0.08)',

                    borderWidth: 2,

                    fill: true,

                    tension: 0.4,

                    pointRadius: 3,

                    pointBackgroundColor: '#3FB950'
                }
            ]
        },

        options:
        {
            ...CHART_DEFAULTS,

            aspectRatio: 2
        }
    });
}


// ═══════════════════════════════════════════
// BAR CHART
// ═══════════════════════════════════════════

function buildBarChart()
{
    const data = getFiltered();

    const packs =
    [
        'Pack 1',
        'Pack 2',
        'Pack 3',
        'Pack 4',
        'Pack 5',
        'Pack 6'
    ];


    const colors =
    [
        '#FF924C',
        '#A7B89C',
        '#E0A25B',
        '#D75B5B',
        '#E57A2A',
        '#3FB950'
    ];


    const voltage = packs.map(pack =>
    {
        const filtered =
            data.filter(d => d.pack === pack);

        return filtered.length
            ? filtered.reduce((s,d) => s + d.voltage, 0)
                / filtered.length
            : 0;
    });


    const soc = packs.map(pack =>
    {
        const filtered =
            data.filter(d => d.pack === pack);

        return filtered.length
            ? filtered.reduce((s,d) => s + d.soc, 0)
                / filtered.length
            : 0;
    });


    const ctx =
        document.getElementById('barChart');

    if(!ctx)
        return;


    if(barChart)
        barChart.destroy();


    barChart = new Chart(ctx,
    {
        type: 'bar',

        data:
        {
            labels: packs,

            datasets:
            [
                {
                    label: 'Voltage (V)',

                    data: voltage,

                    backgroundColor: colors,

                    borderRadius: 6,

                    yAxisID: 'y'
                },

                {
                    label: 'SOC (%)',

                    data: soc,

                    backgroundColor:
                        'rgba(167,184,156,0.5)',

                    borderRadius: 6,

                    yAxisID: 'y1'
                }
            ]
        },

        options:
        {
            ...CHART_DEFAULTS,

            aspectRatio: 2,

            scales:
            {
                x:
                {
                    grid:
                    {
                        color: '#E0E0E0'
                    },

                    ticks:
                    {
                        font:
                        {
                            family: 'Inter',
                            size: 11
                        },

                        color: '#6B6B6B'
                    }
                },

                y:
                {
                    grid:
                    {
                        color: '#E0E0E0'
                    },

                    ticks:
                    {
                        font:
                        {
                            family: 'Inter',
                            size: 11
                        },

                        color: '#6B6B6B'
                    },

                    position: 'left'
                },

                y1:
                {
                    grid:
                    {
                        display: false
                    },

                    ticks:
                    {
                        font:
                        {
                            family: 'Inter',
                            size: 11
                        },

                        color: '#6B6B6B'
                    },

                    position: 'right',

                    max: 100
                }
            }
        }
    });
}


// ═══════════════════════════════════════════
// TREND CHART
// ═══════════════════════════════════════════

let currentRange = 'daily';


function setRange(range, btn)
{
    currentRange = range;

    document
        .querySelectorAll('.rtab')
        .forEach(b => b.classList.remove('active'));

    if(btn)
        btn.classList.add('active');

    buildTrendChart(range);
}


function buildTrendChart(range)
{
    const ctx =
        document.getElementById('trendChart');

    if(!ctx)
        return;


    if(trendChart)
        trendChart.destroy();


    let points = 24;

    let labels = [];

    let soc = [];

    let power = [];

    let anomalies = [];


    if(range === 'weekly')
        points = 7;

    if(range === 'monthly')
        points = 30;

    if(range === 'yearly')
        points = 12;


    const months =
    [
        'Jan','Feb','Mar','Apr','May','Jun',
        'Jul','Aug','Sep','Oct','Nov','Dec'
    ];


    for(let i = points - 1; i >= 0; i--)
    {
        if(range === 'daily')
        {
            labels.push(
                `${String(24 - i).padStart(2,'0')}:00`
            );
        }
        else if(range === 'yearly')
        {
            labels.push(
                months[(12 - i) % 12]
            );
        }
        else
        {
            const d = new Date();

            d.setDate(d.getDate() - i);

            labels.push(
                d.toLocaleDateString(
                    'en-US',
                    {
                        month: 'short',
                        day: 'numeric'
                    }
                )
            );
        }


        const sourceData = getFiltered();

        const index =
            Math.max(
                0,
                sourceData.length - 1 - i
            );


        if(sourceData.length > 0)
        {
            const row = sourceData[index];

            soc.push(Number(row.soc) || 0);

            power.push(Number(row.power) || 0);
        }
        else
        {
            soc.push(0);

            power.push(0);
        }

        anomalies.push(false);
    }


    trendChart = new Chart(ctx,
    {
        type: 'line',

        data:
        {
            labels,

            datasets:
            [
                {
                    label: 'Power (kW)',

                    data: power,

                    borderColor: '#FF924C',

                    backgroundColor:
                        'rgba(255,146,76,0.06)',

                    borderWidth: 2,

                    fill: true,

                    tension: 0.35,

                    yAxisID: 'y',

                    pointRadius: 3,

                    pointBackgroundColor: '#FF924C'
                },

                {
                    label: 'SOC (%)',

                    data: soc,

                    borderColor: '#A7B89C',

                    borderWidth: 2,

                    fill: false,

                    tension: 0.35,

                    pointRadius: 3,

                    pointBackgroundColor: '#A7B89C',

                    yAxisID: 'y1'
                }
            ]
        },

        options:
        {
            ...CHART_DEFAULTS,

            aspectRatio: 2.8,

            scales:
            {
                x:
                {
                    grid:
                    {
                        color: '#E0E0E0'
                    },

                    ticks:
                    {
                        font:
                        {
                            family: 'Inter',
                            size: 11
                        },

                        color: '#6B6B6B',

                        maxRotation: 45
                    }
                },

                y:
                {
                    grid:
                    {
                        color: '#E0E0E0'
                    },

                    ticks:
                    {
                        font:
                        {
                            family: 'Inter',
                            size: 11
                        },

                        color: '#6B6B6B'
                    },

                    position: 'left'
                },

                y1:
                {
                    grid:
                    {
                        display: false
                    },

                    ticks:
                    {
                        font:
                        {
                            family: 'Inter',
                            size: 11
                        },

                        color: '#6B6B6B'
                    },

                    position: 'right',

                    max: 100
                }
            }
        }
    });
}


// ═══════════════════════════════════════════
// PACK TABLE MAP
// ═══════════════════════════════════════════

const PACK_TABLES =
{
    'Pack 1': 'PACK 1 CELLS',
    'Pack 2': 'PACK 2 CELLS',
    'Pack 3': 'PACK 3 CELLS',
    'Pack 4': 'PACK 4 CELLS',
    'Pack 5': 'PACK 5 CELLS',
    'Pack 6': 'PACK 6 CELLS'
};


// ═══════════════════════════════════════════
// HEATMAP
// ═══════════════════════════════════════════

async function buildHeatmap()
{
    const grid =
        document.getElementById('hm-grid');

    if(!grid)
        return;


    const selectedPack =
        document.getElementById('sel-pack')?.value
        || 'Pack 1';


    // All Packs cannot show a single
    // 16-cell heatmap.
    if(selectedPack === 'All Packs')
    {
        grid.innerHTML =
            `
            <div style="padding:20px;">
                Select a specific pack to view cell voltages.
            </div>
            `;

        return;
    }


    const tableName =
        PACK_TABLES[selectedPack];


    if(!tableName)
    {
        grid.innerHTML =
            `
            <div style="padding:20px;">
                Invalid pack selected.
            </div>
            `;

        return;
    }


    grid.innerHTML =
        `
        <div style="padding:20px;">
            Loading ${selectedPack}...
        </div>
        `;


    const { data, error } =
        await db
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);


    if(error)
    {
        console.log(
            `${selectedPack} heatmap error:`,
            error
        );

        grid.innerHTML =
            `
            <div style="padding:20px;">
                No data available for ${selectedPack}.
            </div>
            `;

        return;
    }


    if(!data || data.length === 0)
    {
        grid.innerHTML =
            `
            <div style="padding:20px;">
                No data available for ${selectedPack}.
            </div>
            `;

        return;
    }


    const latest = data[0];


    grid.innerHTML = '';


    // 16 cells = 4 × 4
    for(let i = 1; i <= 16; i++)
    {
        const value =
            latest[`Cell_${i}`];

        const voltage =
            Number(value);


        if(!Number.isFinite(voltage))
            continue;


        let status;
        let bg;


        // Sodium-ion thresholds
        if(voltage <= 1.6 || voltage >= 3.0)
        {
            status = 'alert';
            bg = '#D75B5B';
        }
        else if(voltage <= 1.8 || voltage >= 2.8)
        {
            status = 'caution';
            bg = '#E0A25B';
        }
        else
        {
            status = 'balanced';
            bg = '#25D366';
        }


        const el =
            document.createElement('div');


        el.className = 'hm-zone';

        el.style.background = bg;


        el.innerHTML =
            `
            <div class="z-name">
                Cell ${i}
            </div>

            <div class="z-kwh">
                ${voltage.toFixed(3)}V
            </div>

            <div class="z-tip">

                <strong>
                    ${selectedPack} — Cell ${i}
                </strong>

                <br>

                Voltage:
                <strong>
                    ${voltage.toFixed(3)}V
                </strong>

                <br>

                Status:
                <strong>
                    ${status}
                </strong>

            </div>
            `;


        grid.appendChild(el);
    }


    // Update heatmap title
    const title =
        document.querySelector(
            '#tab-heatmap .card-title'
        );


    if(title)
    {
        title.textContent =
            `Cell Voltage Heat Map — ${selectedPack}`;
    }
}


// ═══════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════

const ALERTS =
[
    {
        id:'a1',
        sev:'critical',
        title:'Cell Voltage Imbalance Detected',
        equip:'Pack 3 — Cell 12',
        time:15,
        threshold:3.35,
        current:3.58,
        desc:'Cell 12 voltage exceeds safe threshold. Immediate balancing required.'
    },

    {
        id:'a2',
        sev:'warning',
        title:'High Temperature Warning',
        equip:'Pack 2 — BMS Sensor',
        time:45,
        threshold:35,
        current:39,
        desc:'Pack 2 temperature elevated. Check cooling system.'
    },

    {
        id:'a3',
        sev:'critical',
        title:'SOC Drop Below Safety Threshold',
        equip:'Pack 5 — Main Battery',
        time:120,
        threshold:20,
        current:18,
        desc:'Pack 5 SOC critically low. Charging recommended immediately.'
    },

    {
        id:'a4',
        sev:'warning',
        title:'Inverter Communication Loss',
        equip:'Inverter 1 — CAN Bus',
        time:180,
        threshold:0,
        current:0,
        desc:'Inverter 1 lost CAN communication. Check wiring and power.'
    },

    {
        id:'a5',
        sev:'info',
        title:'Scheduled Maintenance Due',
        equip:'BMS — Pack 1',
        time:240,
        threshold:0,
        current:0,
        desc:'Routine BMS calibration and cell balancing scheduled.'
    }
];


const REPORTS =
[
    {
        id:'r1',
        title:'Battery Health Summary',
        summary:'Overall system health at 94%, all packs within spec',

        details:
        [
            'Pack 1-6 SOH above 92%',
            'Cell voltage delta <50mV across all packs',
            'Average cycle count: 1,245 cycles',
            'No critical degradation detected'
        ],

        recs:
        [
            'Continue current charge/discharge cycles',
            'Monitor Pack 3 Cell 12 for voltage drift',
            'Schedule balancing for Pack 2 next week'
        ]
    },

    {
        id:'r2',
        title:'Power Flow Analysis',
        summary:'Charge efficiency at 96.2%, PV utilization 89%',

        details:
        [
            'PV array generating 42kW average',
            'Charge efficiency: 96.2% (target: 95%)',
            'Discharge efficiency: 94.8%',
            'Peak power: 48kW at 14:30'
        ],

        recs:
        [
            'Optimize MPPT settings for morning hours',
            'Review inverter settings for peak shaving',
            'Consider battery pre-cooling during charge'
        ]
    },

    {
        id:'r3',
        title:'Thermal Management Report',
        summary:'Temperature range 28-38°C, cooling system optimal',

        details:
        [
            'Avg pack temp: 32.4°C',
            'Max delta between packs: 4.2°C',
            'Cooling system runtime: 18hrs/day',
            'No thermal runaway events'
        ],

        recs:
        [
            'Maintain current cooling schedule',
            'Inspect Pack 2 thermal sensors',
            'Clean cooling fans quarterly'
        ]
    }
];


const SEV_ICON =
{
    critical:'🔴',
    warning:'⚠️',
    info:'ℹ️'
};


const SEV_CLASS =
{
    critical:'sev-critical',
    warning:'sev-warning',
    info:'sev-info'
};


const SEV_LABEL =
{
    critical:'Critical',
    warning:'Warning',
    info:'Info'
};


function fmtTime(mins)
{
    if(mins < 60)
        return `${mins}m ago`;

    return `${Math.floor(mins / 60)}h ago`;
}


function buildAlerts()
{
    const list =
        document.getElementById('alerts-list');

    if(!list)
        return;


    const critCount =
        ALERTS.filter(
            a => a.sev === 'critical'
        ).length;


    document.getElementById('crit-badge').textContent =
        `${critCount} Critical`;


    list.innerHTML =
        ALERTS.map(a =>
        `
        <div class="acc-item">

            <button
                class="acc-trigger"
                onclick="toggleAcc('${a.id}')"
            >

                <span class="acc-sev-icon">
                    ${SEV_ICON[a.sev]}
                </span>

                <div class="acc-meta">

                    <div class="acc-meta-row">

                        <span class="acc-title">
                            ${a.title}
                        </span>

                        <span class="sev-badge ${SEV_CLASS[a.sev]}">
                            ${SEV_LABEL[a.sev]}
                        </span>

                    </div>

                    <div class="acc-sub">
                        ${a.equip}
                    </div>

                    <div class="acc-sub">
                        ${fmtTime(a.time)}
                    </div>

                </div>

                <span
                    class="acc-chevron"
                    id="chev-${a.id}"
                >
                    ▾
                </span>

            </button>


            <div
                class="acc-body"
                id="body-${a.id}"
            >

                <p>
                    ${a.desc}
                </p>


                ${
                    a.threshold > 0
                    ?
                    `
                    <div class="acc-metrics">

                        <div class="acc-metric-row">
                            <span>Threshold:</span>
                            <span>${a.threshold}</span>
                        </div>

                        <div class="acc-metric-row">
                            <span>Current Value:</span>
                            <span style="color:#D75B5B">
                                ${a.current}
                            </span>
                        </div>

                    </div>
                    `
                    :
                    ''
                }


                <div class="acc-recs">

                    <div class="acc-recs-title">
                        Recommended Actions:
                    </div>

                    <ul>
                        <li>
                            Inspect equipment for mechanical issues or faults
                        </li>

                        <li>
                            Review recent operational changes
                        </li>

                        <li>
                            Contact maintenance if issue persists beyond 2 hours
                        </li>
                    </ul>

                </div>

            </div>

        </div>
        `
        ).join('');
}


function buildReports()
{
    const list =
        document.getElementById('reports-list');

    if(!list)
        return;


    list.innerHTML =
        REPORTS.map(r =>
        `
        <div class="acc-item">

            <button
                class="acc-trigger"
                onclick="toggleAcc('${r.id}')"
            >

                <span class="acc-sev-icon">
                    📋
                </span>

                <div class="acc-meta">

                    <div class="acc-title">
                        ${r.title}
                    </div>

                    <div
                        class="acc-sub"
                        style="margin-top:3px"
                    >
                        ${r.summary}
                    </div>

                </div>

                <span
                    class="acc-chevron"
                    id="chev-${r.id}"
                >
                    ▾
                </span>

            </button>


            <div
                class="acc-body"
                id="body-${r.id}"
            >

                <div class="acc-recs">

                    <div class="acc-recs-title">
                        ✅ Key Findings
                    </div>

                    <ul>
                        ${
                            r.details
                            .map(d => `<li>${d}</li>`)
                            .join('')
                        }
                    </ul>

                </div>


                <div
                    class="acc-recs"
                    style="margin-top:10px"
                >

                    <div class="acc-recs-title">
                        💡 Recommendations
                    </div>

                    <ul>
                        ${
                            r.recs
                            .map(rec => `<li>${rec}</li>`)
                            .join('')
                        }
                    </ul>

                </div>

            </div>

        </div>
        `
        ).join('');
}


function toggleAcc(id)
{
    const body =
        document.getElementById('body-' + id);

    const chev =
        document.getElementById('chev-' + id);

    if(!body)
        return;


    const open =
        body.classList.toggle('open');


    if(chev)
        chev.classList.toggle('open', open);
}


// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════

let toastTimer;


function showToast(msg)
{
    const t =
        document.getElementById('toast');

    if(!t)
        return;


    t.textContent = msg;

    t.classList.remove('hidden');

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () => t.classList.add('hidden'),
            3000
        );
}


// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

function initDashboard()
{
    getBMSData();

    buildHeatmap();

    buildAlerts();

    buildReports();

    buildTrendChart(currentRange);
}
