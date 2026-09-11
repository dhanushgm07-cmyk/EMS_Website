/* ═══════════════════════════════════════════
   EMS — script.js
   8 PACK REAL SUPABASE VERSION
═══════════════════════════════════════════ */

const supabaseUrl = "https://xfozfhopqxokmdcgyhqy.supabase.co";

const supabaseKey =
  "sb_publishable_yx3wAYXNdfYo8HwrmDUryQ_idY6gR7z";

const db = supabase.createClient(
  supabaseUrl,
  supabaseKey
);


/* ═══════════════════════════════════════════
   PACK CONFIGURATION
═══════════════════════════════════════════ */

const PACKS = [
  "Pack 1",
  "Pack 2",
  "Pack 3",
  "Pack 4",
  "Pack 5",
  "Pack 6",
  "Pack 7",
  "Pack 8"
];

const PACK_TABLES = {
  "Pack 1": "PACK 1 CELLS",
  "Pack 2": "PACK 2 CELLS",
  "Pack 3": "PACK 3 CELLS",
  "Pack 4": "PACK 4 CELLS",
  "Pack 5": "PACK 5 CELLS",
  "Pack 6": "PACK 6 CELLS",
  "Pack 7": "PACK 7 CELLS",
  "Pack 8": "PACK 8 CELLS"
};


/* ═══════════════════════════════════════════
   GLOBAL DATA
═══════════════════════════════════════════ */

let BMS_DATA = [];
let PACK_DATA = {};

let lineChart = null;
let barChart = null;
let trendChart = null;

let currentRange = "daily";
let selectedLocation = "";


/* ═══════════════════════════════════════════
   GET OVERALL BMS DATA
═══════════════════════════════════════════ */

async function getBMSData() {

  const { data, error } = await db
    .from("BMS_Data")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("BMS DATA ERROR:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.warn("No BMS data available");
    return;
  }

  BMS_DATA = data;

  /*
     IMPORTANT:
     These KPI values are ALWAYS SYSTEM/OVERALL values.
     Pack selector does NOT change them.
  */

  const latest = data[0];

  setValue("kpi-soc", latest.Soc);
  setValue("kpi-voltage", latest.Voltage);
  setValue("kpi-current", latest.Current);
  setValue("kpi-temp", latest.Temperature);
  setValue("kpi-pv", latest.Pv_power);
  setValue("kpi-power", latest.Power);

  updateKPIStatus(latest.Current);

  buildLineChart();
  buildBarChart();
}


/* ═══════════════════════════════════════════
   SODIUM-ION SOC CALCULATION
═══════════════════════════════════════════ */

/*
   Calculates estimated SOC from average cell voltage.

   Pack contains 16 cells in series.

   Average Cell Voltage =
       Pack Voltage / 16

   Sodium-ion reference range used here:

       1.50 V = 0%
       3.50 V = 100%

   IMPORTANT:
   This is an ESTIMATED SOC based on voltage.
   It is NOT the SOC reported by the RBMS.

   The exact voltage/SOC curve depends on the
   specific sodium-ion cell chemistry.
*/

function calculateSodiumIonSOC(voltage) {

  const v = Number(voltage);

  if (!Number.isFinite(v)) {
    return 0;
  }

  const curve = [

    { v: 1.50, soc: 0 },

    { v: 1.70, soc: 5 },

    { v: 2.00, soc: 10 },

    { v: 2.20, soc: 20 },

    { v: 2.40, soc: 30 },

    { v: 2.60, soc: 40 },

    { v: 2.80, soc: 50 },

    { v: 3.00, soc: 60 },

    { v: 3.10, soc: 70 },

    { v: 3.20, soc: 80 },

    { v: 3.30, soc: 90 },

    { v: 3.40, soc: 95 },

    { v: 3.50, soc: 100 }

  ];

  /*
     Below minimum cutoff
  */

  if (v <= 1.50) {
    return 0;
  }

  /*
     Above maximum reference
  */

  if (v >= 3.50) {
    return 100;
  }

  /*
     Linear interpolation
  */

  for (let i = 0; i < curve.length - 1; i++) {

    const lower = curve[i];
    const upper = curve[i + 1];

    if (
      v >= lower.v &&
      v <= upper.v
    ) {

      const ratio =
        (v - lower.v) /
        (upper.v - lower.v);

      const calculatedSOC =
        lower.soc +
        ratio *
        (upper.soc - lower.soc);

      return Math.round(
        Math.max(
          0,
          Math.min(
            100,
            calculatedSOC
          )
        )
      );
    }
  }

  return 0;
}


/* ═══════════════════════════════════════════
   GET CELL DATA FOR ALL 8 PACKS
═══════════════════════════════════════════ */

async function getAllPackData() {

  const requests = PACKS.map(async pack => {

    const table = PACK_TABLES[pack];

    const { data, error } = await db
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {

      console.error(
        pack + " ERROR:",
        error
      );

      return;
    }

    if (data && data.length > 0) {

      const row = data[0];

      const cells = [];

      for (let i = 1; i <= 16; i++) {

        const value =
          parseFloat(
            row[`Cell_${i}`]
          );

        if (Number.isFinite(value)) {

          cells.push(value);

        } else {

          cells.push(0);

        }

      }

      /*
         Cell values are stored in volts.

         Pack voltage =
         sum of all 16 cells.
      */

      const packVoltage =
        cells.reduce(
          (sum, value) =>
            sum + value,
          0
        );

      /*
         Average cell voltage
      */

      const averageCellVoltage =
        packVoltage / 16;

      /*
         Calculate estimated SOC
         from average cell voltage.
      */

      const soc =
        calculateSodiumIonSOC(
          averageCellVoltage
        );

      PACK_DATA[pack] = {

        cells: cells,

        voltage: packVoltage,

        averageCellVoltage:
          averageCellVoltage,

        soc: soc,

        created_at:
          row.created_at

      };

    }

  });

  await Promise.all(requests);

  updateSelectedPackDisplay();

  buildBarChart();
}


/* ═══════════════════════════════════════════
   SAFE VALUE SETTER
═══════════════════════════════════════════ */

function setValue(id, value) {

  const el =
    document.getElementById(id);

  if (!el) return;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    el.textContent = "--";

    return;
  }

  const number =
    Number(value);

  if (Number.isFinite(number)) {

    el.textContent =
      number.toFixed(1);

  } else {

    el.textContent = value;

  }

}


/* ═══════════════════════════════════════════
   KPI STATUS
═══════════════════════════════════════════ */

function updateKPIStatus(current) {

  const currTrend =
    document.getElementById(
      "kpi-current-trend"
    );

  const powTrend =
    document.getElementById(
      "kpi-power-trend"
    );

  if (!currTrend || !powTrend) {
    return;
  }

  if (Number(current) > 0) {

    currTrend.textContent =
      "Charging";

    currTrend.className =
      "kpi-trend up";

    powTrend.textContent =
      "Charging";

    powTrend.className =
      "kpi-trend up";

  }

  else if (Number(current) < 0) {

    currTrend.textContent =
      "Discharging";

    currTrend.className =
      "kpi-trend down";

    powTrend.textContent =
      "Discharging";

    powTrend.className =
      "kpi-trend down";

  }

  else {

    currTrend.textContent =
      "Idle";

    currTrend.className =
      "kpi-trend";

    powTrend.textContent =
      "Idle";

    powTrend.className =
      "kpi-trend";

  }

}


/* ═══════════════════════════════════════════
   SELECTED PACK
═══════════════════════════════════════════ */

function getSelectedPack() {

  const selector =
    document.getElementById(
      "sel-pack"
    );

  if (!selector) {
    return "All Packs";
  }

  return selector.value ||
    "All Packs";
}


/* ═══════════════════════════════════════════
   PACK DISPLAY
═══════════════════════════════════════════ */

function updateSelectedPackDisplay() {

  const selected =
    getSelectedPack();

  /*
     We intentionally DO NOT change
     the six KPI cards here.

     They remain overall/system values.
  */

  if (selected === "All Packs") {

    return;

  }

  const pack =
    PACK_DATA[selected];

  if (!pack) {

    console.warn(
      "No data for",
      selected
    );

    return;

  }

  console.log(
    selected,
    "Voltage:",
    pack.voltage.toFixed(2),
    "V",
    "Average Cell:",
    pack.averageCellVoltage.toFixed(3),
    "V",
    "SOC:",
    pack.soc + "%"
  );

}


/* ═══════════════════════════════════════════
   FILTER CHANGE
═══════════════════════════════════════════ */

function onFilterChange() {

  /*
     KPI cards remain OVERALL.

     Only pack-specific visualizations change.
  */

  updateSelectedPackDisplay();

  buildLineChart();

  buildBarChart();

  if (
    document
      .getElementById("tab-heatmap")
      ?.classList.contains("active")
  ) {

    buildHeatmap();

  }

}


/* ═══════════════════════════════════════════
   LINE CHART
═══════════════════════════════════════════ */

function buildLineChart() {

  const ctx =
    document.getElementById(
      "lineChart"
    );

  if (!ctx) return;

  if (lineChart) {

    lineChart.destroy();

  }

  if (!BMS_DATA.length) {
    return;
  }

  const selected =
    getSelectedPack();

  let data =
    [...BMS_DATA];

  /*
     BMS_Data is overall/system data.

     It is therefore NOT filtered by pack.
  */

  const labels =
    data
      .slice()
      .reverse()
      .map(row =>
        new Date(
          row.created_at
        )
        .toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )
      );

  const powerValues =
    data
      .slice()
      .reverse()
      .map(row =>
        Number(
          row.Power || 0
        )
      );

  const pvValues =
    data
      .slice()
      .reverse()
      .map(row =>
        Number(
          row.Pv_power || 0
        )
      );

  lineChart =
    new Chart(
      ctx,
      {

        type: "line",

        data: {

          labels: labels,

          datasets: [

            {

              label:
                "Charge/Discharge Power (kW)",

              data:
                powerValues,

              borderColor:
                "#FF924C",

              backgroundColor:
                "rgba(255,146,76,0.08)",

              borderWidth: 2,

              fill: true,

              tension: 0.4,

              pointRadius: 2

            },

            {

              label:
                "PV Input (kW)",

              data:
                pvValues,

              borderColor:
                "#3FB950",

              backgroundColor:
                "rgba(63,185,80,0.08)",

              borderWidth: 2,

              fill: true,

              tension: 0.4,

              pointRadius: 2

            }

          ]

        },

        options: {

          ...CHART_DEFAULTS,

          aspectRatio: 2

        }

      }
    );

}


/* ═══════════════════════════════════════════
   BAR CHART — 8 PACKS
═══════════════════════════════════════════ */

function buildBarChart() {

  const ctx =
    document.getElementById(
      "barChart"
    );

  if (!ctx) return;

  if (barChart) {

    barChart.destroy();

  }

  const voltage =
    PACKS.map(pack => {

      const data =
        PACK_DATA[pack];

      if (!data) {
        return 0;
      }

      return Number(
        data.voltage || 0
      );

    });


  /*
     SOC is now calculated from
     average cell voltage for every pack.
  */

  const soc =
    PACKS.map(pack => {

      const data =
        PACK_DATA[pack];

      if (!data) {
        return 0;
      }

      return Number(
        data.soc || 0
      );

    });


  barChart =
    new Chart(
      ctx,
      {

        type: "bar",

        data: {

          labels: PACKS,

          datasets: [

            {

              label:
                "Voltage (V)",

              data:
                voltage,

              backgroundColor: [

                "#FF924C",

                "#A7B89C",

                "#E0A25B",

                "#D75B5B",

                "#E57A2A",

                "#3FB950",

                "#6B8E23",

                "#8A6FDF"

              ],

              borderRadius: 6,

              yAxisID: "y"

            },

            {

              label:
                "SOC (%)",

              data:
                soc,

              backgroundColor:
                "rgba(167,184,156,0.5)",

              borderRadius: 6,

              yAxisID: "y1"

            }

          ]

        },

        options: {

          ...CHART_DEFAULTS,

          aspectRatio: 2,

          scales: {

            x: {

              grid: {

                color:
                  "#E0E0E0"

              },

              ticks: {

                font: {

                  family:
                    "Inter",

                  size: 11

                },

                color:
                  "#6B6B6B"

              }

            },

            y: {

              grid: {

                color:
                  "#E0E0E0"

              },

              ticks: {

                font: {

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

            y1: {

              grid: {

                display:
                  false

              },

              ticks: {

                font: {

                  family:
                    "Inter",

                  size: 11

                },

                color:
                  "#6B6B6B",

                callback:
                  value =>
                    value + "%"

              },

              position:
                "right",

              min: 0,

              max: 100

            }

          }

        }

      }
    );

}


/* ═══════════════════════════════════════════
   CHART DEFAULTS
═══════════════════════════════════════════ */

const CHART_DEFAULTS = {

  responsive: true,

  maintainAspectRatio: true,

  plugins: {

    legend: {

      labels: {

        font: {

          family:
            "Inter",

          size: 11

        },

        color:
          "#6B6B6B",

        boxWidth: 12

      }

    }

  },

  scales: {

    x: {

      grid: {

        color:
          "#E0E0E0"

      },

      ticks: {

        font: {

          family:
            "Inter",

          size: 11

        },

        color:
          "#6B6B6B"

      }

    },

    y: {

      grid: {

        color:
          "#E0E0E0"

      },

      ticks: {

        font: {

          family:
            "Inter",

          size: 11

        },

        color:
          "#6B6B6B"

      }

    }

  }

};


/* ═══════════════════════════════════════════
   HEATMAP
═══════════════════════════════════════════ */

function buildHeatmap() {

  const grid =
    document.getElementById(
      "hm-grid"
    );

  if (!grid) return;

  grid.innerHTML = "";

  const selected =
    getSelectedPack();

  /*
     KEEPING THE ORIGINAL
     HEATMAP STRUCTURE.

     For now, All Packs continues
     using Pack 1 exactly as before.

     We will change the selector/
     multi-pack heatmap separately.
  */

  const packName =
    selected === "All Packs"
      ? "Pack 1"
      : selected;

  const pack =
    PACK_DATA[packName];

  if (!pack) {

    grid.innerHTML =
      "<div style='padding:20px'>" +
      "No cell data available." +
      "</div>";

    return;

  }

  const cells =
    pack.cells;

  for (
    let i = 0;
    i < 16;
    i++
  ) {

    const v =
      Number(
        cells[i] || 0
      );

    let status;

    /*
       Sodium-ion thresholds:

       Alert:
       <1.5V or >3.5V

       Caution:
       1.5–1.7V or 3.4–3.5V

       Balanced:
       1.7–3.4V
    */

    if (
      v < 1.5 ||
      v > 3.5
    ) {

      status =
        "alert";

    }

    else if (
      v < 1.7 ||
      v > 3.4
    ) {

      status =
        "caution";

    }

    else {

      status =
        "balanced";

    }


    const bg =
      status === "alert"

        ? "#D75B5B"

        : status === "caution"

        ? "#E0A25B"

        : "#A7B89C";


    const el =
      document.createElement(
        "div"
      );

    el.className =
      "hm-zone";

    el.style.background =
      bg;

    el.innerHTML = `

      <div class="z-name">
        Cell ${i + 1}
      </div>

      <div class="z-kwh">
        ${v.toFixed(3)}V
      </div>

      <div class="z-tip">

        <strong>
          ${packName} — Cell ${i + 1}
        </strong>

        <br>

        Voltage:

        <strong>
          ${v.toFixed(3)}V
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


  const title =
    document.querySelector(
      "#tab-heatmap .card-title"
    );

  if (title) {

    title.textContent =
      `Cell Voltage Heat Map — ${packName}`;

  }

}


/* ═══════════════════════════════════════════
   TRENDS
═══════════════════════════════════════════ */

function setRange(
  range,
  btn
) {

  currentRange =
    range;

  document
    .querySelectorAll(
      ".rtab"
    )
    .forEach(
      b =>
        b.classList.remove(
          "active"
        )
    );

  if (btn) {

    btn.classList.add(
      "active"
    );

  }

  buildTrendChart(
    range
  );

}


function buildTrendChart(
  range
) {

  const ctx =
    document.getElementById(
      "trendChart"
    );

  if (!ctx) return;

  if (trendChart) {

    trendChart.destroy();

  }

  if (!BMS_DATA.length) {
    return;
  }

  const data =
    BMS_DATA
      .slice()
      .reverse();


  const labels =
    data.map(
      row =>
        new Date(
          row.created_at
        )
        .toLocaleTimeString(
          [],
          {
            hour:
              "2-digit",

            minute:
              "2-digit"
          }
        )
    );


  const soc =
    data.map(
      row =>
        Number(
          row.Soc || 0
        )
    );


  const power =
    data.map(
      row =>
        Number(
          row.Power || 0
        )
    );


  trendChart =
    new Chart(
      ctx,
      {

        type:
          "line",

        data: {

          labels:
            labels,

          datasets: [

            {

              label:
                "Power (kW)",

              data:
                power,

              borderColor:
                "#FF924C",

              backgroundColor:
                "rgba(255,146,76,0.06)",

              borderWidth: 2,

              fill: true,

              tension:
                0.35,

              yAxisID:
                "y"

            },

            {

              label:
                "SOC (%)",

              data:
                soc,

              borderColor:
                "#A7B89C",

              borderWidth: 2,

              fill: false,

              tension:
                0.35,

              yAxisID:
                "y1"

            }

          ]

        },

        options: {

          ...CHART_DEFAULTS,

          aspectRatio:
            2.8,

          scales: {

            x: {

              grid: {

                color:
                  "#E0E0E0"

              }

            },

            y: {

              position:
                "left"

            },

            y1: {

              position:
                "right",

              max:
                100,

              grid: {

                display:
                  false

              }

            }

          }

        }

      }
    );

}


/* ═══════════════════════════════════════════
   ALERTS
═══════════════════════════════════════════ */

const ALERTS = [

  {

    id:
      "a1",

    sev:
      "critical",

    title:
      "Cell Voltage Imbalance Detected",

    equip:
      "Pack 3 — Cell 12",

    time:
      15,

    threshold:
      3.35,

    current:
      3.58,

    desc:
      "Cell voltage exceeds the safe threshold. Immediate balancing required."

  },

  {

    id:
      "a2",

    sev:
      "warning",

    title:
      "High Temperature Warning",

    equip:
      "BMS Temperature Sensor",

    time:
      45,

    threshold:
      35,

    current:
      39,

    desc:
      "Battery temperature elevated. Check cooling system."

  }

];


const SEV_ICON = {

  critical:
    "🔴",

  warning:
    "⚠️",

  info:
    "ℹ️"

};


const SEV_CLASS = {

  critical:
    "sev-critical",

  warning:
    "sev-warning",

  info:
    "sev-info"

};


const SEV_LABEL = {

  critical:
    "Critical",

  warning:
    "Warning",

  info:
    "Info"

};


function fmtTime(
  mins
) {

  if (mins < 60) {

    return `${mins}m ago`;

  }

  return `${Math.floor(mins / 60)}h ago`;

}


function buildAlerts() {

  const list =
    document.getElementById(
      "alerts-list"
    );

  if (!list) return;

  const critCount =
    ALERTS.filter(
      a =>
        a.sev ===
        "critical"
    ).length;

  const badge =
    document.getElementById(
      "crit-badge"
    );

  if (badge) {

    badge.textContent =
      `${critCount} Critical`;

  }


  list.innerHTML =
    ALERTS
      .map(
        a => `

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

              <span
                class="sev-badge ${SEV_CLASS[a.sev]}"
              >
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

        </div>

      </div>

    `
      )
      .join("");

}


/* ═══════════════════════════════════════════
   REPORTS
═══════════════════════════════════════════ */

const REPORTS = [

  {

    id:
      "r1",

    title:
      "Battery Health Summary",

    summary:
      "Overall system battery monitoring",

    details: [

      "Monitoring all 8 battery packs",

      "Cell voltage data received from RBMS",

      "Pack-level voltage calculated from cell data"

    ],

    recs: [

      "Monitor cell voltage imbalance",

      "Investigate abnormal cells",

      "Maintain regular balancing"

    ]

  }

];


function buildReports() {

  const list =
    document.getElementById(
      "reports-list"
    );

  if (!list) return;

  list.innerHTML =
    REPORTS
      .map(
        r => `

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
                  .map(
                    d =>
                      `<li>${d}</li>`
                  )
                  .join("")
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
                  .map(
                    r =>
                      `<li>${r}</li>`
                  )
                  .join("")
              }

            </ul>

          </div>

        </div>

      </div>

    `
      )
      .join("");

}


/* ═══════════════════════════════════════════
   ACCORDION
═══════════════════════════════════════════ */

function toggleAcc(
  id
) {

  const body =
    document.getElementById(
      "body-" + id
    );

  const chev =
    document.getElementById(
      "chev-" + id
    );

  if (!body) return;

  const open =
    body.classList.toggle(
      "open"
    );

  if (chev) {

    chev.classList.toggle(
      "open",
      open
    );

  }

}


/* ═══════════════════════════════════════════
   LOCATION
═══════════════════════════════════════════ */

function clearLocation() {

  selectedLocation =
    "";

  const pill =
    document.getElementById(
      "loc-pill"
    );

  if (pill) {

    pill.classList.add(
      "hidden"
    );

  }

  onFilterChange();

}


function setLocation(
  loc
) {

  selectedLocation =
    loc;

  const label =
    document.getElementById(
      "loc-label"
    );

  const pill =
    document.getElementById(
      "loc-pill"
    );

  if (label) {

    label.textContent =
      loc;

  }

  if (pill) {

    pill.classList.remove(
      "hidden"
    );

  }

  showToast(
    `Filter Applied: ${loc}`
  );

  onFilterChange();

}


/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */

let toastTimer;


function showToast(
  msg
) {

  const t =
    document.getElementById(
      "toast"
    );

  if (!t) return;

  t.textContent =
    msg;

  t.classList.remove(
    "hidden"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () =>
        t.classList.add(
          "hidden"
        ),
      3000
    );

}


/* ═══════════════════════════════════════════
   TABS
═══════════════════════════════════════════ */

function switchTab(
  name,
  btn
) {

  document
    .querySelectorAll(
      ".tab-panel"
    )
    .forEach(
      p =>
        p.classList.add(
          "hidden"
        )
    );

  document
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      b =>
        b.classList.remove(
          "active"
        )
    );

  const panel =
    document.getElementById(
      "tab-" + name
    );

  if (panel) {

    panel.classList.remove(
      "hidden"
    );

  }

  if (btn) {

    btn.classList.add(
      "active"
    );

  }

  if (name === "heatmap") {

    buildHeatmap();

  }

  if (name === "trends") {

    buildTrendChart(
      currentRange
    );

  }

}


/* ═══════════════════════════════════════════
   AUTH
═══════════════════════════════════════════ */

const USERS = {

  admin:
    "admin123",

  sodion:
    "sodion123",

  operator:
    "op2024"

};


function login() {

  const u =
    document
      .getElementById(
        "username"
      )
      .value
      .trim();

  const p =
    document
      .getElementById(
        "password"
      )
      .value;

  const err =
    document.getElementById(
      "login-error"
    );


  if (
    USERS[u] &&
    USERS[u] === p
  ) {

    err.classList.add(
      "hidden"
    );

    document
      .getElementById(
        "user-chip"
      )
      .textContent =
      u[0].toUpperCase();

    document
      .getElementById(
        "login-page"
      )
      .classList.remove(
        "active"
      );

    document
      .getElementById(
        "dashboard-page"
      )
      .classList.add(
        "active"
      );

    initDashboard();

  }

  else {

    err.classList.remove(
      "hidden"
    );

  }

}


function logout() {

  document
    .getElementById(
      "dashboard-page"
    )
    .classList.remove(
      "active"
    );

  document
    .getElementById(
      "login-page"
    )
    .classList.add(
      "active"
    );

  document
    .getElementById(
      "username"
    )
    .value = "";

  document
    .getElementById(
      "password"
    )
    .value = "";

  destroyCharts();

}


/* ═══════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════ */

setInterval(
  () => {

    const n =
      new Date();

    const pad =
      v =>
        String(v)
          .padStart(
            2,
            "0"
          );

    const clock =
      document.getElementById(
        "clock"
      );

    if (clock) {

      clock.textContent =
        `${pad(n.getHours())}:` +
        `${pad(n.getMinutes())}:` +
        `${pad(n.getSeconds())}`;

    }

  },
  1000
);


/* ═══════════════════════════════════════════
   DESTROY CHARTS
═══════════════════════════════════════════ */

function destroyCharts() {

  [

    lineChart,

    barChart,

    trendChart

  ]
    .forEach(
      chart => {

        if (chart) {

          chart.destroy();

        }

      }
    );

  lineChart =
    null;

  barChart =
    null;

  trendChart =
    null;

}


/* ═══════════════════════════════════════════
   INITIALIZATION
═══════════════════════════════════════════ */

async function initDashboard() {

  await getBMSData();

  await getAllPackData();

  buildHeatmap();

  buildAlerts();

  buildReports();

}


/* ═══════════════════════════════════════════
   LIVE UPDATE
═══════════════════════════════════════════ */

let refreshTimer =
  null;


function startLiveUpdates() {

  if (refreshTimer) {

    clearInterval(
      refreshTimer
    );

  }

  refreshTimer =
    setInterval(
      async () => {

        await getBMSData();

        await getAllPackData();

        /*
           No page flashing.
           No fake animation.
           Existing UI remains.
        */

      },
      5000
    );

}


/* ═══════════════════════════════════════════
   START
═══════════════════════════════════════════ */

document.addEventListener(
  "keydown",
  e => {

    if (
      e.key === "Enter" &&
      document
        .getElementById(
          "login-page"
        )
        ?.classList.contains(
          "active"
        )
    ) {

      login();

    }

  }
);


/*
   Start live updates after
   the dashboard loads.
*/

const originalInitDashboard =
  initDashboard;


initDashboard =
  async function () {

    await originalInitDashboard();

    startLiveUpdates();

  };
