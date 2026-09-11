/* ═══════════════════════════════════════════
   EMS — script.js
   8 PACK REAL SUPABASE VERSION
═══════════════════════════════════════════ */

const supabaseUrl =
  "https://xfozfhopqxokmdcgyhqy.supabase.co";

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

let refreshTimer = null;
let toastTimer = null;


/* ═══════════════════════════════════════════
   GET OVERALL BMS DATA
═══════════════════════════════════════════ */

async function getBMSData() {

  const { data, error } = await db
    .from("BMS_Data")
    .select("*")
    .order("created_at", {
      ascending: false
    })
    .limit(50);

  if (error) {

    console.error(
      "BMS DATA ERROR:",
      error
    );

    return;
  }

  if (!data || data.length === 0) {

    console.warn(
      "No BMS data available"
    );

    return;
  }

  BMS_DATA = data;

  /*
     These six KPI cards are ALWAYS
     overall/system values.

     The pack selector does NOT
     affect them.
  */

  const latest = data[0];

  setValue(
    "kpi-soc",
    latest.Soc
  );

  setValue(
    "kpi-voltage",
    latest.Voltage
  );

  setValue(
    "kpi-current",
    latest.Current
  );

  setValue(
    "kpi-temp",
    latest.Temperature
  );

  setValue(
    "kpi-pv",
    latest.Pv_power
  );

  setValue(
    "kpi-power",
    latest.Power
  );

  updateKPIStatus(
    latest.Current
  );

  buildLineChart();
  buildBarChart();
}


/* ═══════════════════════════════════════════
   SODIUM-ION VOLTAGE BASED SOC ESTIMATION
═══════════════════════════════════════════ */

function calculateEstimatedSOCFromCellVoltage(
  cellVoltage
) {

  const points = [

    [1.50, 0],
    [2.00, 5],
    [2.50, 10],
    [2.80, 20],
    [3.00, 30],
    [3.10, 40],
    [3.20, 50],
    [3.25, 60],
    [3.30, 75],
    [3.35, 90],
    [3.40, 97],
    [3.45, 100]

  ];

  const v =
    Number(cellVoltage);

  if (!Number.isFinite(v)) {
    return 0;
  }

  if (v <= points[0][0]) {
    return 0;
  }

  if (
    v >=
    points[points.length - 1][0]
  ) {
    return 100;
  }

  for (
    let i = 1;
    i < points.length;
    i++
  ) {

    const [
      v1,
      s1
    ] = points[i - 1];

    const [
      v2,
      s2
    ] = points[i];

    if (v <= v2) {

      const ratio =
        (v - v1) /
        (v2 - v1);

      return Math.round(
        s1 +
        ratio *
        (s2 - s1)
      );
    }
  }

  return 0;
}


/* ═══════════════════════════════════════════
   CALCULATE PACK SOC
═══════════════════════════════════════════ */

function calculatePackSOC(
  cells
) {

  const validCells =
    cells
      .map(Number)
      .filter(
        v =>
          Number.isFinite(v) &&
          v > 0
      );

  if (!validCells.length) {
    return 0;
  }

  const averageCellVoltage =
    validCells.reduce(
      (sum, v) =>
        sum + v,
      0
    ) /
    validCells.length;

  return calculateEstimatedSOCFromCellVoltage(
    averageCellVoltage
  );
}


/* ═══════════════════════════════════════════
   GET CELL DATA FOR ALL 8 PACKS
═══════════════════════════════════════════ */

async function getAllPackData() {

  const requests =
    PACKS.map(
      async pack => {

        const table =
          PACK_TABLES[pack];

        const {
          data,
          error
        } = await db
          .from(table)
          .select("*")
          .order(
            "created_at",
            {
              ascending: false
            }
          )
          .limit(1);

        if (error) {

          console.error(
            pack +
            " ERROR:",
            error
          );

          return;
        }

        if (
          data &&
          data.length > 0
        ) {

          const row =
            data[0];

          const cells = [];

          for (
            let i = 1;
            i <= 16;
            i++
          ) {

            const value =
              parseFloat(
                row[
                  `Cell_${i}`
                ]
              );

            if (
              Number.isFinite(value)
            ) {

              cells.push(
                value
              );

            } else {

              cells.push(0);

            }
          }

          /*
             Cell values in Supabase
             are stored in VOLTS.

             Pack voltage =
             sum of 16 cell voltages.
          */

          const packVoltage =
            cells.reduce(
              (sum, value) =>
                sum + value,
              0
            );

          const averageCellVoltage =
            cells.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            cells.length;

          const estimatedSOC =
            calculatePackSOC(
              cells
            );

          PACK_DATA[pack] = {

            cells:
              cells,

            voltage:
              packVoltage,

            averageCellVoltage:
              averageCellVoltage,

            soc:
              estimatedSOC,

            created_at:
              row.created_at

          };
        }
      }
    );

  await Promise.all(
    requests
  );

  /*
     Voltage/SOC chart ALWAYS
     shows all available packs.
  */

  buildBarChart();

  /*
     Update the currently selected
     heat-map pack.
  */

  buildHeatmap();
}


/* ═══════════════════════════════════════════
   SAFE VALUE SETTER
═══════════════════════════════════════════ */

function setValue(
  id,
  value
) {

  const el =
    document.getElementById(id);

  if (!el) {
    return;
  }

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

  if (
    Number.isFinite(number)
  ) {

    el.textContent =
      number.toFixed(1);

  } else {

    el.textContent =
      value;
  }
}


/* ═══════════════════════════════════════════
   KPI STATUS
═══════════════════════════════════════════ */

function updateKPIStatus(
  current
) {

  const currTrend =
    document.getElementById(
      "kpi-current-trend"
    );

  const powTrend =
    document.getElementById(
      "kpi-power-trend"
    );

  if (
    !currTrend ||
    !powTrend
  ) {
    return;
  }

  if (
    Number(current) > 0
  ) {

    currTrend.textContent =
      "Charging";

    currTrend.className =
      "kpi-trend up";

    powTrend.textContent =
      "Charging";

    powTrend.className =
      "kpi-trend up";

  }

  else if (
    Number(current) < 0
  ) {

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
   USED ONLY BY CELL HEAT MAP
═══════════════════════════════════════════ */

function getSelectedPack() {

  const selector =
    document.getElementById(
      "sel-pack"
    );

  if (!selector) {
    return "Pack 1";
  }

  if (
    PACKS.includes(
      selector.value
    )
  ) {

    return selector.value;

  }

  return "Pack 1";
}


/* ═══════════════════════════════════════════
   PACK DISPLAY
   INTENTIONALLY EMPTY

   The Voltage & SOC chart is NOT controlled
   by the pack selector.
═══════════════════════════════════════════ */

function updateSelectedPackDisplay() {

  /*
     Intentionally empty.

     Pack selector is ONLY for
     Cell Voltage Heat Map.

     Battery Voltage & SOC chart
     always displays all 8 packs.
  */

}


/* ═══════════════════════════════════════════
   FILTER CHANGE
   ONLY HEAT MAP CHANGES
═══════════════════════════════════════════ */

function onFilterChange() {

  /*
     IMPORTANT:

     Do NOT rebuild the bar chart here.

     The Voltage & SOC chart must
     always remain All 8 Packs.

     Only the Cell Voltage Heat Map
     changes when Pack selection changes.
  */

  buildHeatmap();
}


/* ═══════════════════════════════════════════
   LINE CHART
   OVERALL SYSTEM DATA
═══════════════════════════════════════════ */

function buildLineChart() {

  const ctx =
    document.getElementById(
      "lineChart"
    );

  if (!ctx) {
    return;
  }

  if (lineChart) {

    lineChart.destroy();

    lineChart = null;
  }

  if (!BMS_DATA.length) {
    return;
  }

  const data =
    [...BMS_DATA];

  const labels =
    data
      .slice()
      .reverse()
      .map(
        row =>
          new Date(
            row.created_at
          ).toLocaleTimeString(
            [],
            {
              hour:
                "2-digit",
              minute:
                "2-digit"
            }
          )
      );

  const powerValues =
    data
      .slice()
      .reverse()
      .map(
        row =>
          Number(
            row.Power || 0
          )
      );

  const pvValues =
    data
      .slice()
      .reverse()
      .map(
        row =>
          Number(
            row.Pv_power || 0
          )
      );

  lineChart =
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
                "Charge/Discharge Power (kW)",

              data:
                powerValues,

              borderColor:
                "#FF924C",

              backgroundColor:
                "rgba(255,146,76,0.08)",

              borderWidth:
                2,

              fill:
                true,

              tension:
                0.4,

              pointRadius:
                2

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

              borderWidth:
                2,

              fill:
                true,

              tension:
                0.4,

              pointRadius:
                2

            }

          ]
        },

        options: {

          ...CHART_DEFAULTS,

          aspectRatio:
            2
        }

      }
    );
}


/* ═══════════════════════════════════════════
   BATTERY VOLTAGE & SOC
   ALWAYS ALL 8 PACKS
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   BAR CHART — BATTERY PACK VOLTAGE & SOC
═══════════════════════════════════════════ */

function buildBarChart() {

  const ctx =
    document.getElementById("barChart");
  const ctx = document.getElementById("barChart");

  if (!ctx) return;

  const selected = getSelectedPack();

  const packsToShow =
    selected === "All Packs"
      ? PACKS.filter(pack => PACK_DATA[pack])
      : PACK_DATA[selected]
      ? [selected]
      : [];

  if (!packsToShow.length) return;

  const labels = packsToShow;

  const voltage = packsToShow.map(pack =>
    Number(PACK_DATA[pack]?.voltage || 0)
  );

  const soc = packsToShow.map(pack =>
    Number(PACK_DATA[pack]?.soc || 0)
  );

  const voltageColors = [
    "#FF924C",
    "#A7B89C",
    "#E0A25B",
    "#D75B5B",
    "#E57A2A",
    "#3FB950",
    "#6B8E23",
    "#8A6FDF"
  ];


  /* =================================================
     IF CHART ALREADY EXISTS
     UPDATE IT — DON'T DESTROY IT
     ================================================= */

  if (barChart) {
    barChart.destroy();
  }

  /*
     Get voltage for all 8 packs
  */
  const voltage = PACKS.map(pack => {
    const oldLabels = barChart.data.labels || [];

    const data = PACK_DATA[pack];
    const labelsChanged =
      oldLabels.length !== labels.length ||
      oldLabels.some(
        (label, index) => label !== labels[index]
      );

    if (!data) return 0;
    /*
       If user changes between:
       All Packs ↔ individual Pack

    return Number(data.voltage || 0);
  });
       recreate chart because number of bars changes.
    */

    if (labelsChanged) {

  /*
     SOC is calculated from pack voltage
  */
  const soc = PACKS.map(pack => {
      barChart.destroy();
      barChart = null;

    const data = PACK_DATA[pack];
    }
  }

    if (!data) return 0;

    return Number(data.soc || 0);
  });
  /* =================================================
     CREATE CHART FIRST TIME
     ================================================= */

  if (!barChart) {

  barChart = new Chart(ctx, {
    barChart = new Chart(ctx, {

    type: "bar",
      type: "bar",

    data: {
      data: {

      labels: PACKS,
        labels: labels,

      datasets: [
        datasets: [

        {
          label: "Voltage (V)",
          {
            label: "Voltage (V)",

          data: voltage,
            data: voltage,

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
            backgroundColor:
              packsToShow.map(pack =>
                voltageColors[PACKS.indexOf(pack)]
              ),

          borderRadius: 6,
            borderRadius: 6,

          yAxisID: "y"
        },
            yAxisID: "y"
          },

          {
            label: "SOC (%)",

        {
          label: "SOC (%)",
            data: soc,

          data: soc,
            backgroundColor:
              "rgba(167,184,156,0.5)",

          backgroundColor:
            "rgba(167,184,156,0.5)",
            borderRadius: 6,

          borderRadius: 6,
            yAxisID: "y1"
          }

          yAxisID: "y1"
        }
        ]

      ]
      },

    },
      options: {

        ...CHART_DEFAULTS,

    options: {
        aspectRatio: 1.8,

      ...CHART_DEFAULTS,

      /*
         Slightly larger than the current chart
      */
      aspectRatio: 1.8,
        /* =================================================
           THIS IS THE MOVING ANIMATION
           ================================================= */

        animation: {

      scales: {
          duration: 1200,

        /* ───────────────
           VOLTAGE AXIS
           ─────────────── */
          easing: "easeInOutQuart"

        y: {
        },

          position: "left",
        animations: {

          /*
             IMPORTANT:
             Prevent Chart.js from zooming into
             49.83–49.86 V.
          */
          y: {

          min: 0,
            duration: 1200,

          max: 60,
            easing: "easeInOutQuart"

          beginAtZero: true,
          }

          grid: {
            color: "#E0E0E0"
          },
        },


        plugins: {

          ...CHART_DEFAULTS.plugins,

          ticks: {
          title: {

            stepSize: 10,
            display: true,

            text:
              selected === "All Packs"
                ? "Battery Voltage & Estimated SOC — All Packs"
                : `Battery Voltage & Estimated SOC — ${selected}`,

            font: {

              family: "Inter",
              size: 11
            },

            color: "#6B6B6B",
              size: 13,

            callback: function(value) {
              return value + " V";
            }
              weight: "600"

            },

            color: "#4A4A4A"

          }

        },


        /* ───────────────
           SOC AXIS
           ─────────────── */
        scales: {

        y1: {
          x: {

          position: "right",
            grid: {

          min: 0,
              color: "#E0E0E0"

          max: 100,
            },

          beginAtZero: true,
            ticks: {

          grid: {
            display: false
          },
              font: {

          ticks: {
                family: "Inter",

            stepSize: 20,
                size: 11

            font: {
              family: "Inter",
              size: 11
            },
              },

            color: "#6B6B6B",
              color: "#6B6B6B"

            callback: function(value) {
              return value + " %";
            }

          }
          },

        },

          /* LEFT SIDE — VOLTAGE */

        /* ───────────────
           X AXIS
           ─────────────── */
          y: {

        x: {
            position: "left",

          grid: {
            color: "#E0E0E0"
          },
            min: 0,

          ticks: {
            max: 60,

            beginAtZero: true,

            grid: {

              color: "#E0E0E0"

            font: {
              family: "Inter",
              size: 11
            },

            color: "#6B6B6B"
          }
            ticks: {

        }
              stepSize: 10,

      }
              font: {

    }
                family: "Inter",

  });
                size: 11

}
              },

              color: "#6B6B6B",

/* ═══════════════════════════════════════════
   CHART DEFAULTS
═══════════════════════════════════════════ */
              callback: function(value) {

const CHART_DEFAULTS = {
                return value + " V";

  responsive:
    true,
              }

  maintainAspectRatio:
    true,
            }

  plugins: {
          },

    legend: {

      labels: {
          /* RIGHT SIDE — SOC */

        font: {
          y1: {

          family:
            "Inter",
            position: "right",

          size:
            11
        },
            min: 0,

        color:
          "#6B6B6B",
            max: 100,

        boxWidth:
          12
      }
    }
            beginAtZero: true,

  },
            grid: {

              display: false

  scales: {
            },

    x: {
            ticks: {

      grid: {
              stepSize: 20,

        color:
          "#E0E0E0"
      },
              font: {

      ticks: {
                family: "Inter",

        font: {
                size: 11

          family:
            "Inter",
              },

          size:
            11
        },
              color: "#6B6B6B",

              callback: function(value) {

                return value + " %";

              }

            }

          }

        }

        color:
          "#6B6B6B"
      }

    },
    });

    y: {
    return;
  }

      grid: {

        color:
          "#E0E0E0"
      },
  /* =================================================
     UPDATE EXISTING CHART
     ================================================= */

      ticks: {
  barChart.data.labels = labels;

        font: {
  barChart.data.datasets[0].data = voltage;

          family:
            "Inter",
  barChart.data.datasets[1].data = soc;

          size:
            11
        },

        color:
          "#6B6B6B"
      }
  barChart.data.datasets[0].backgroundColor =
    packsToShow.map(pack =>
      voltageColors[PACKS.indexOf(pack)]
    );

    }

  /* Update title */

  if (barChart.options.plugins?.title) {

    barChart.options.plugins.title.text =
      selected === "All Packs"
        ? "Battery Voltage & Estimated SOC — All Packs"
        : `Battery Voltage & Estimated SOC — ${selected}`;

  }

};

  /* =================================================
     THIS MAKES THE BARS MOVE TO THE NEW VALUES
     ================================================= */

  barChart.update();

}


/* ═══════════════════════════════════════════
   CELL VOLTAGE HEAT MAP
   SINGLE PACK ONLY
═══════════════════════════════════════════ */

function buildHeatmap() {

  const grid =
    document.getElementById(
      "hm-grid"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML =
    "";

  /*
     SINGLE PACK ONLY.

     There is NO "All Packs"
     mode anymore.
  */

  const selected =
    getSelectedPack();

  const pack =
    PACK_DATA[selected];

  if (!pack) {

    grid.innerHTML =
      "<div style='padding:20px'>No cell data available.</div>";

    return;
  }

  const cells =
    pack.cells || [];

  /*
     Always render exactly
     16 cells.
  */

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
       < 1.5V or > 3.5V

       Caution:
       1.5–1.7V
       3.4–3.5V

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
          ${selected} — Cell ${i + 1}
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

    grid.appendChild(
      el
    );
  }

  const title =
    document.querySelector(
      "#tab-heatmap .card-title"
    );

  if (title) {

    title.textContent =
      `Cell Voltage Heat Map — ${selected}`;

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

  if (!ctx) {
    return;
  }

  if (trendChart) {

    trendChart.destroy();

    trendChart = null;
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
        ).toLocaleTimeString(
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

              borderWidth:
                2,

              fill:
                true,

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

              borderWidth:
                2,

              fill:
                false,

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

  if (
    mins < 60
  ) {

    return (
      `${mins}m ago`
    );
  }

  return (
    `${Math.floor(
      mins / 60
    )}h ago`
  );
}


function buildAlerts() {

  const list =
    document.getElementById(
      "alerts-list"
    );

  if (!list) {
    return;
  }

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
    ALERTS.map(
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
    ).join("");
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

  if (!list) {
    return;
  }

  list.innerHTML =
    REPORTS.map(
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
                      item =>
                        `<li>${item}</li>`
                    )
                    .join("")
                }

              </ul>

            </div>

          </div>

        </div>

      `
    ).join("");
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

  if (!body) {
    return;
  }

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

function showToast(
  msg
) {

  const t =
    document.getElementById(
      "toast"
    );

  if (!t) {
    return;
  }

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

  if (
    name ===
    "heatmap"
  ) {

    buildHeatmap();
  }

  if (
    name ===
    "trends"
  ) {

    buildTrendChart(
      currentRange
    );
  }
}


/* ═══════════════════════════════════════════
   AUTO MOVING EFFECT — EVERY 5 SECONDS
═══════════════════════════════════════════ */

let barChartOffset = 0;

setInterval(() => {

  if (!barChart) return;

  const totalPacks = PACKS.length;

  if (totalPacks <= 1) return;

  barChartOffset++;

  if (barChartOffset >= totalPacks) {
    barChartOffset = 0;
  }

  /*
     Smooth movement to the next pack
  */
  barChart.options.animation = {
    duration: 900,
    easing: "easeInOutQuart"
  };

  barChart.update();

}, 5000);


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

  const username =
    document
      .getElementById(
        "username"
      )
      .value
      .trim();

  const password =
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
    USERS[username] &&
    USERS[username] ===
      password
  ) {

    if (err) {

      err.classList.add(
        "hidden"
      );
    }

    const chip =
      document.getElementById(
        "user-chip"
      );

    if (chip) {

      chip.textContent =
        username[0]
          .toUpperCase();
    }

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

    if (err) {

      err.classList.remove(
        "hidden"
      );
    }

  }
}


function logout() {

  const dashboard =
    document.getElementById(
      "dashboard-page"
    );

  const loginPage =
    document.getElementById(
      "login-page"
    );

  if (dashboard) {

    dashboard.classList.remove(
      "active"
    );
  }

  if (loginPage) {

    loginPage.classList.add(
      "active"
    );
  }

  const username =
    document.getElementById(
      "username"
    );

  const password =
    document.getElementById(
      "password"
    );

  if (username) {
    username.value = "";
  }

  if (password) {
    password.value = "";
  }

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
  ].forEach(
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
   PACK SELECTOR
   PACK 1–8 ONLY
   NO "ALL PACKS"
═══════════════════════════════════════════ */

function ensurePackSelectorOptions() {

  const selector =
    document.getElementById(
      "sel-pack"
    );

  if (!selector) {
    return;
  }

  const currentValue =
    selector.value;

  /*
     Completely rebuild selector.

     This guarantees that an old
     "All Packs" option from the HTML
     is removed.
  */

  selector.innerHTML =
    "";

  PACKS.forEach(
    pack => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        pack;

      option.textContent =
        pack;

      selector.appendChild(
        option
      );

    }
  );

  if (
    PACKS.includes(
      currentValue
    )
  ) {

    selector.value =
      currentValue;

  }

  else {

    selector.value =
      "Pack 1";
  }

  /*
     IMPORTANT:

     Selector changes ONLY
     the Cell Voltage Heat Map.
  */

  selector.onchange =
    onFilterChange;
}


/* ═══════════════════════════════════════════
   INITIALIZATION
═══════════════════════════════════════════ */

async function initDashboard() {

  /*
     Setup Pack 1–8 selector.
  */

  ensurePackSelectorOptions();

  /*
     Get overall BMS data.
  */

  await getBMSData();

  /*
     Get cell data from all
     eight Supabase tables.
  */

  await getAllPackData();

  /*
     Build remaining sections.
  */

  buildHeatmap();

  buildAlerts();

  buildReports();
}


/* ═══════════════════════════════════════════
   LIVE UPDATE
═══════════════════════════════════════════ */

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

           Existing dashboard UI
           remains visible.

           Bar chart stays All 8 Packs.

           Heat map stays on whichever
           Pack is currently selected.
        */

      },
      5000
    );
}


/* ═══════════════════════════════════════════
   ENTER KEY LOGIN
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


/* ═══════════════════════════════════════════
   START LIVE UPDATES AFTER DASHBOARD LOAD
═══════════════════════════════════════════ */

const originalInitDashboard =
  initDashboard;

initDashboard =
  async function () {

    await originalInitDashboard();

    startLiveUpdates();
  };
