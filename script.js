const supabaseUrl = "https://xfozfhopqxokmdcgyhqy.supabase.co";

const supabaseKey = "sb_publishable_yx3wAYXNdfYo8HwrmDUryQ_idY6gR7z";

const db = supabase.createClient(
    supabaseUrl,
    supabaseKey
);

let RAW_DATA = [];

async function getBMSData()
{
    const { data, error } = await db
        .from("BMS_Data")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error)
    {
        console.log("BMS DATA ERROR:", error);
        return;
    }

    if (!data || data.length === 0)
    {
        console.log("No BMS data found");
        return;
    }

    let latest = data[0];

    document.getElementById("kpi-soc").innerHTML = latest.Soc;
    document.getElementById("kpi-voltage").innerHTML = latest.Voltage;
    document.getElementById("kpi-current").innerHTML = latest.Current;
    document.getElementById("kpi-temp").innerHTML = latest.Temperature;
    document.getElementById("kpi-pv").innerHTML = latest.Pv_power;
    document.getElementById("kpi-power").innerHTML = latest.Power;

    RAW_DATA = data.map(row => ({
        hour: new Date(row.created_at).getHours() + ":00",
        pack: "Pack 1",
        soc: row.Soc,
        voltage: row.Voltage,
        current: row.Current,
        power: row.Power,
        temp: row.Temperature,
        pv: row.Pv_power
    }));

    buildLineChart();
    buildBarChart();
}

async function buildHeatmap()
{
    const grid = document.getElementById("hm-grid");

    if (!grid)
    {
        console.log("Heatmap grid not found");
        return;
    }

    const { data, error } = await db
        .from("PACK 1 CELLS")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

    if (error)
    {
        console.log("PACK 1 CELLS ERROR:", error);
        return;
    }

    if (!data || data.length === 0)
    {
        console.log("No Pack 1 cell data found");
        return;
    }

    const latest = data[0];

    console.log("Latest Pack 1 Cells:", latest);

    grid.innerHTML = "";

    for (let i = 1; i <= 16; i++)
    {
        const value = latest[`Cell_${i}`];
        const voltage = Number(value);

        if (isNaN(voltage))
        {
            console.log(`Invalid value for Cell_${i}:`, value);
            continue;
        }

        let status;

        if (voltage <= 1.6 || voltage >= 3.0)
        {
            status = "alert";
        }
        else if (voltage <= 1.8 || voltage >= 2.8)
        {
            status = "caution";
        }
        else
        {
            status = "balanced";
        }

        let bg;

        if (status === "alert")
        {
            bg = "#D75B5B";
        }
        else if (status === "caution")
        {
            bg = "#E0A25B";
        }
        else
        {
            bg = "#A7B89C";
        }

        const el = document.createElement("div");

        el.className = "hm-zone";
        el.style.background = bg;

        el.innerHTML = `
            <div class="z-name">Cell ${i}</div>
            <div class="z-kwh">${voltage.toFixed(3)} V</div>

            <div class="z-tip">
                <strong>Cell ${i}</strong><br>
                Voltage: <strong>${voltage.toFixed(3)} V</strong><br>
                Status: <strong>${status}</strong>
            </div>
        `;

        grid.appendChild(el);
    }
}

getBMSData();
buildHeatmap();

setInterval(() =>
{
    getBMSData();
    buildHeatmap();
}, 5000);


const USERS = {
    admin: "admin123",
    sodion: "sodion123",
    operator: "op2024"
};

function login()
{
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value;
    const err = document.getElementById("login-error");

    if (USERS[u] && USERS[u] === p)
    {
        err.classList.add("hidden");

        document.getElementById("user-chip").textContent =
            u[0].toUpperCase();

        document.getElementById("login-page")
            .classList.remove("active");

        document.getElementById("dashboard-page")
            .classList.add("active");

        initDashboard();
    }
    else
    {
        err.classList.remove("hidden");
    }
}

function logout()
{
    document.getElementById("dashboard-page")
        .classList.remove("active");

    document.getElementById("login-page")
        .classList.add("active");

    document.getElementById("username").value = "";
    document.getElementById("password").value = "";

    destroyCharts();
}

document.addEventListener("keydown", e =>
{
    if (
        e.key === "Enter" &&
        document.getElementById("login-page")
            .classList.contains("active")
    )
    {
        login();
    }
});


setInterval(() =>
{
    const n = new Date();

    const pad = v =>
        String(v).padStart(2, "0");

    document.getElementById("clock").textContent =
        `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;

}, 1000);


function switchTab(name, btn)
{
    document
        .querySelectorAll(".tab-panel")
        .forEach(p => p.classList.add("hidden"));

    document
        .querySelectorAll(".tab")
        .forEach(b => b.classList.remove("active"));

    document
        .getElementById("tab-" + name)
        .classList.remove("hidden");

    if (btn)
    {
        btn.classList.add("active");
    }

    if (name === "trends")
    {
        buildTrendChart(currentRange);
    }

    if (name === "overview")
    {
        buildHeatmap();
    }
}


let selectedLocation = "";

function onFilterChange()
{
    updateKPIs();
    buildLineChart();
    buildBarChart();
}

function clearLocation()
{
    selectedLocation = "";

    document
        .getElementById("loc-pill")
        .classList.add("hidden");

    onFilterChange();
}

function setLocation(loc)
{
    selectedLocation = loc;

    document
        .getElementById("loc-label")
        .textContent = loc;

    document
        .getElementById("loc-pill")
        .classList.remove("hidden");

    showToast(`Filter Applied: ${loc}`);

    onFilterChange();
}


function rand(min, max, dec = 0)
{
    return parseFloat(
        (
            Math.random() * (max - min) + min
        ).toFixed(dec)
    );
}


function generateHourlyData()
{
    const packs =
    [
        "Pack 1",
        "Pack 2",
        "Pack 3",
        "Pack 4",
        "Pack 5",
        "Pack 6"
    ];

    const hours =
        Array.from(
            { length: 24 },
            (_, i) =>
                `${String(i).padStart(2, "0")}:00`
        );

    const data = [];

    hours.forEach(h =>
    {
        const hr = parseInt(h);

        const solar =
            hr >= 6 && hr <= 18
                ? rand(0, 50)
                : 0;

        packs.forEach(pack =>
        {
            const soc = rand(65, 95, 1);
            const voltage = rand(48, 54, 1);
            const current = rand(-30, 30, 1);

            const power =
                voltage * current / 1000;

            const temp = rand(25, 38, 1);

            data.push({
                hour: h,
                pack,
                soc,
                voltage,
                current,
                power,
                temp,
                pv: solar
            });
        });
    });

    return data;
}


function getFiltered()
{
    const pack =
        document
            .getElementById("sel-pack")
            ?.value ||
        "All Packs";

    return RAW_DATA.filter(d =>
        pack === "All Packs" ||
        d.pack === pack
    );
}


function calcKPIs(data)
{
    if (!data || data.length === 0)
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
        data.reduce((s, d) => s + d.soc, 0) /
        data.length;

    const avgVoltage =
        data.reduce((s, d) => s + d.voltage, 0) /
        data.length;

    const avgCurrent =
        data.reduce((s, d) => s + d.current, 0) /
        data.length;

    const avgTemp =
        data.reduce((s, d) => s + d.temp, 0) /
        data.length;

    const avgPower =
        data.reduce((s, d) => s + d.power, 0) /
        data.length;

    const avgPV =
        data.reduce((s, d) => s + d.pv, 0) /
        data.length;

    return {
        soc: avgSOC,
        voltage: avgVoltage,
        current: avgCurrent,
        temp: avgTemp,
        power: avgPower,
        pv: avgPV
    };
}


function animateValue(id, target)
{
    const el =
        document.getElementById(id);

    if (!el)
    {
        return;
    }

    let current = 0;

    const step = target / 40;

    const iv = setInterval(() =>
    {
        current += step;

        if (current >= target)
        {
            el.textContent =
                target.toFixed(1);

            clearInterval(iv);
        }
        else
        {
            el.textContent =
                current.toFixed(1);
        }

    }, 25);
}


function updateKPIs()
{
    const kpis =
        calcKPIs(getFiltered());

    animateValue("kpi-soc", kpis.soc);
    animateValue("kpi-voltage", kpis.voltage);
    animateValue("kpi-current", kpis.current);
    animateValue("kpi-temp", kpis.temp);
    animateValue(
        "kpi-power",
        Math.abs(kpis.power)
    );
    animateValue("kpi-pv", kpis.pv);

    const currTrend =
        document.getElementById(
            "kpi-current-trend"
        );

    const powTrend =
        document.getElementById(
            "kpi-power-trend"
        );

    if (kpis.current > 0)
    {
        currTrend.textContent = "Charging";
        currTrend.className =
            "kpi-trend up";

        powTrend.textContent = "Charging";
        powTrend.className =
            "kpi-trend up";
    }
    else
    {
        currTrend.textContent =
            "Discharging";

        currTrend.className =
            "kpi-trend down";

        powTrend.textContent =
            "Discharging";

        powTrend.className =
            "kpi-trend down";
    }
}


let lineChart = null;
let barChart = null;
let trendChart = null;


function destroyCharts()
{
    [
        lineChart,
        barChart,
        trendChart
    ].forEach(c =>
    {
        if (c)
        {
            c.destroy();
        }
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
                    family: "Inter",
                    size: 11
                },

                color: "#6B6B6B",

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
                color: "#E0E0E0"
            },

            ticks:
            {
                font:
                {
                    family: "Inter",
                    size: 11
                },

                color: "#6B6B6B"
            }
        },

        y:
        {
            grid:
            {
                color: "#E0E0E0"
            },

            ticks:
            {
                font:
                {
                    family: "Inter",
                    size: 11
                },

                color: "#6B6B6B"
            }
        }
    }
};


function buildLineChart()
{
    const data = getFiltered();

    const byHour = {};

    data.forEach(d =>
    {
        if (!byHour[d.hour])
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
            byHour[l].power /
            byHour[l].count
        );

    const pvVals =
        labels.map(l =>
            byHour[l].pv /
            byHour[l].count
        );

    const ctx =
        document.getElementById(
            "lineChart"
        );

    if (!ctx)
    {
        return;
    }

    if (lineChart)
    {
        lineChart.destroy();
    }

    lineChart = new Chart(ctx,
    {
        type: "line",

        data:
        {
            labels,

            datasets:
            [
                {
                    label:
                        "Charge/Discharge Power (kW)",

                    data: powerVals,

                    borderColor: "#FF924C",

                    backgroundColor:
                        "rgba(255,146,76,0.08)",

                    borderWidth: 2,

                    fill: true,

                    tension: 0.4,

                    pointRadius: 3,

                    pointBackgroundColor:
                        "#FF924C"
                },

                {
                    label:
                        "PV Input (kW)",

                    data: pvVals,

                    borderColor:
                        "#3FB950",

                    backgroundColor:
                        "rgba(63,185,80,0.08)",

                    borderWidth: 2,

                    fill: true,

                    tension: 0.4,

                    pointRadius: 3,

                    pointBackgroundColor:
                        "#3FB950"
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


function buildBarChart()
{
    const data = getFiltered();

    const packs =
    [
        "Pack 1",
        "Pack 2",
        "Pack 3",
        "Pack 4",
        "Pack 5",
        "Pack 6"
    ];

    const colors =
    [
        "#FF924C",
        "#A7B89C",
        "#E0A25B",
        "#D75B5B",
        "#E57A2A",
        "#3FB950"
    ];

    const voltage =
        packs.map(pack =>
        {
            const filtered =
                data.filter(
                    d => d.pack === pack
                );

            return filtered.length
                ? filtered.reduce(
                    (s, d) =>
                        s + d.voltage,
                    0
                ) / filtered.length
                : 0;
        });

    const soc =
        packs.map(pack =>
        {
            const filtered =
                data.filter(
                    d => d.pack === pack
                );

            return filtered.length
                ? filtered.reduce(
                    (s, d) =>
                        s + d.soc,
                    0
                ) / filtered.length
                : 0;
        });

    const ctx =
        document.getElementById(
            "barChart"
        );

    if (!ctx)
    {
        return;
    }

    if (barChart)
    {
        barChart.destroy();
    }

    barChart =
        new Chart(ctx,
        {
            type: "bar",

            data:
            {
                labels: packs,

                datasets:
                [
                    {
                        label:
                            "Voltage (V)",

                        data: voltage,

                        backgroundColor:
                            colors,

                        borderRadius: 6,

                        yAxisID: "y"
                    },

                    {
                        label:
                            "SOC (%)",

                        data: soc,

                        backgroundColor:
                            "rgba(167,184,156,0.5)",

                        borderRadius: 6,

                        yAxisID: "y1"
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
                            color:
                                "#E0E0E0"
                        },

                        ticks:
                        {
                            font:
                            {
                                family:
                                    "Inter",

                                size: 11
                            },

                            color:
                                "#6B6B6B"
                        }
                    },

                    y:
                    {
                        grid:
                        {
                            color:
                                "#E0E0E0"
                        },

                        ticks:
                        {
                            font:
                            {
                                family:
                                    "Inter",

                                size: 11
                            },

                            color:
                                "#6B6B6B"
                        },

                        position:
                            "left"
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
                                family:
                                    "Inter",

                                size: 11
                            },

                            color:
                                "#6B6B6B"
                        },

                        position:
                            "right",

                        max: 100
                    }
                }
            }
        });
}


let currentRange = "daily";


function setRange(range, btn)
{
    currentRange = range;

    document
        .querySelectorAll(".rtab")
        .forEach(b =>
            b.classList.remove("active")
        );

    if (btn)
    {
        btn.classList.add("active");
    }

    buildTrendChart(range);
}


function buildTrendChart(range)
{
    const ctx =
        document.getElementById(
            "trendChart"
        );

    if (!ctx)
    {
        return;
    }

    if (trendChart)
    {
        trendChart.destroy();
    }

    let points = 24;

    let labels = [];
    let soc = [];
    let power = [];
    let anomalies = [];

    if (range === "weekly")
    {
        points = 7;
    }

    if (range === "monthly")
    {
        points = 30;
    }

    if (range === "yearly")
    {
        points = 12;
    }

    const months =
    [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];

    for (
        let i = points - 1;
        i >= 0;
        i--
    )
    {
        if (range === "daily")
        {
            labels.push(
                `${String(24 - i)
                    .padStart(2, "0")}:00`
            );
        }
        else if (range === "yearly")
        {
            labels.push(
                months[(12 - i) % 12]
            );
        }
        else
        {
            const d = new Date();

            d.setDate(
                d.getDate() - i
            );

            labels.push(
                d.toLocaleDateString(
                    "en-US",
                    {
                        month: "short",
                        day: "numeric"
                    }
                )
            );
        }

        const s =
            Math.round(
                70 + rand(0, 25)
            );

        const p =
            rand(-20, 30, 1);

        const isAnom =
            rand(0, 1) > 0.85;

        soc.push(s);
        power.push(p);
        anomalies.push(isAnom);
    }

    trendChart =
        new Chart(ctx,
        {
            type: "line",

            data:
            {
                labels,

                datasets:
                [
                    {
                        label:
                            "Power (kW)",

                        data: power,

                        borderColor:
                            "#FF924C",

                        backgroundColor:
                            "rgba(255,146,76,0.06)",

                        borderWidth: 2,

                        fill: true,

                        tension: 0.35,

                        yAxisID: "y",

                        pointRadius:
                            anomalies.map(
                                a =>
                                    a ? 6 : 3
                            ),

                        pointBackgroundColor:
                            anomalies.map(
                                a =>
                                    a
                                        ? "#D75B5B"
                                        : "#FF924C"
                            ),

                        pointBorderColor:
                            anomalies.map(
                                a =>
                                    a
                                        ? "#fff"
                                        : "#FF924C"
                            ),

                        pointBorderWidth:
                            anomalies.map(
                                a =>
                                    a ? 2 : 0
                            )
                    },

                    {
                        label:
                            "SOC (%)",

                        data: soc,

                        borderColor:
                            "#A7B89C",

                        borderWidth: 2,

                        fill: false,

                        tension: 0.35,

                        pointRadius: 3,

                        pointBackgroundColor:
                            "#A7B89C",

                        yAxisID: "y1"
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
                            color:
                                "#E0E0E0"
                        },

                        ticks:
                        {
                            font:
                            {
                                family:
                                    "Inter",

                                size: 11
                            },

                            color:
                                "#6B6B6B",

                            maxRotation: 45
                        }
                    },

                    y:
                    {
                        grid:
                        {
                            color:
                                "#E0E0E0"
                        },

                        ticks:
                        {
                            font:
                            {
                                family:
                                    "Inter",

                                size: 11
                            },

                            color:
                                "#6B6B6B"
                        },

                        position:
                            "left"
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
                                family:
                                    "Inter",

                                size: 11
                            },

                            color:
                                "#6B6B6B"
                        },

                        position:
                            "right",

                        max: 100
                    }
                }
            }
        });
}


const ALERTS =
[
    {
        id: "a1",
        sev: "critical",
        title:
            "Cell Voltage Imbalance Detected",

        equip:
            "Pack 3 — Cell 12",

        time: 15,

        threshold: 3.35,

        current: 3.58,

        desc:
            "Cell 12 voltage exceeds safe threshold."
    },

    {
        id: "a2",
        sev: "warning",

        title:
            "High Temperature Warning",

        equip:
            "Pack 2 — BMS Sensor",

        time: 45,

        threshold: 35,

        current: 39,

        desc:
            "Pack 2 temperature elevated."
    }
];


const REPORTS = [];


const SEV_ICON =
{
    critical: "🔴",
    warning: "⚠️",
    info: "ℹ️"
};

const SEV_CLASS =
{
    critical: "sev-critical",
    warning: "sev-warning",
    info: "sev-info"
};

const SEV_LABEL =
{
    critical: "Critical",
    warning: "Warning",
    info: "Info"
};


function fmtTime(mins)
{
    if (mins < 60)
    {
        return `${mins}m ago`;
    }

    return `${Math.floor(
        mins / 60
    )}h ago`;
}


function toggleAcc(id)
{
    const body =
        document.getElementById(
            "body-" + id
        );

    const chev =
        document.getElementById(
            "chev-" + id
        );

    if (!body)
    {
        return;
    }

    const open =
        body.classList.toggle("open");

    if (chev)
    {
        chev.classList.toggle(
            "open",
            open
        );
    }
}


let toastTimer;


function showToast(msg)
{
    const t =
        document.getElementById(
            "toast"
        );

    t.textContent = msg;

    t.classList.remove("hidden");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () =>
                t.classList.add("hidden"),
            3000
        );
}


function initDashboard()
{
    getBMSData();
    buildHeatmap();
}
