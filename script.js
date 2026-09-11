@@ -1,47 +1,49 @@
/* ═══════════════════════════════════════════
EMS — script.js
8 PACK REAL SUPABASE VERSION
   EMS — script.js
   8 PACK REAL SUPABASE VERSION
═══════════════════════════════════════════ */

const supabaseUrl =
"https://xfozfhopqxokmdcgyhqy.supabase.co";
  "https://xfozfhopqxokmdcgyhqy.supabase.co";

const supabaseKey =
"sb_publishable_yx3wAYXNdfYo8HwrmDUryQ_idY6gR7z";
  "sb_publishable_yx3wAYXNdfYo8HwrmDUryQ_idY6gR7z";

const db = supabase.createClient(
supabaseUrl,
supabaseKey
  supabaseUrl,
  supabaseKey
);


/* ═══════════════════════════════════════════
PACK CONFIGURATION
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
   GLOBAL DATA
═══════════════════════════════════════════ */

let BMS_DATA = [];
@@ -57,2461 +59,2457 @@ let selectedLocation = "";
let refreshTimer = null;
let toastTimer = null;


/* ═══════════════════════════════════════════
GET OVERALL BMS DATA
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
  const { data, error } = await db
    .from("BMS_Data")
    .select("*")
    .order("created_at", {
      ascending: false
    })
    .limit(50);

console.error(
  "BMS DATA ERROR:",
  error
);

return;

}
  if (error) {

if (!data || data.length === 0) {
    console.error(
      "BMS DATA ERROR:",
      error
    );

console.warn(
  "No BMS data available"
);
    return;
  }

return;
  if (!data || data.length === 0) {

}
    console.warn(
      "No BMS data available"
    );

BMS_DATA = data;
    return;
  }

/*
These six KPI cards are ALWAYS
overall/system values.
  BMS_DATA = data;

 The pack selector does NOT
 affect them.
  /*
     These six KPI cards are ALWAYS
     overall/system values.

*/
     The pack selector does NOT
     affect them.
  */

const latest = data[0];
  const latest = data[0];

setValue(
"kpi-soc",
latest.Soc
);
  setValue(
    "kpi-soc",
    latest.Soc
  );

setValue(
"kpi-voltage",
latest.Voltage
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
    "kpi-current",
    latest.Current
  );

setValue(
"kpi-temp",
latest.Temperature
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
    "kpi-pv",
    latest.Pv_power
  );

setValue(
"kpi-power",
latest.Power
);
  setValue(
    "kpi-power",
    latest.Power
  );

updateKPIStatus(
latest.Current
);
  updateKPIStatus(
    latest.Current
  );

buildLineChart();
buildBarChart();
  buildLineChart();
  buildBarChart();
}


/* ═══════════════════════════════════════════
SODIUM-ION VOLTAGE BASED SOC ESTIMATION
   SODIUM-ION VOLTAGE BASED SOC ESTIMATION
═══════════════════════════════════════════ */

function calculateEstimatedSOCFromCellVoltage(
cellVoltage
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
  const points = [

];
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

const v =
Number(cellVoltage);
  ];

if (!Number.isFinite(v)) {
return 0;
}
  const v =
    Number(cellVoltage);

if (v <= points[0][0]) {
return 0;
}
  if (!Number.isFinite(v)) {
    return 0;
  }

if (
v >=
points[points.length - 1][0]
) {
return 100;
}
  if (v <= points[0][0]) {
    return 0;
  }

for (
let i = 1;
i < points.length;
i++
) {
  if (
    v >=
    points[points.length - 1][0]
  ) {
    return 100;
  }

const [
  v1,
  s1
] = points[i - 1];
  for (
    let i = 1;
    i < points.length;
    i++
  ) {

const [
  v2,
  s2
] = points[i];
    const [
      v1,
      s1
    ] = points[i - 1];

if (v <= v2) {
    const [
      v2,
      s2
    ] = points[i];

  const ratio =
    (v - v1) /
    (v2 - v1);
    if (v <= v2) {

  return Math.round(
    s1 +
    ratio *
    (s2 - s1)
  );
}
      const ratio =
        (v - v1) /
        (v2 - v1);

}
      return Math.round(
        s1 +
        ratio *
        (s2 - s1)
      );
    }
  }

return 0;
  return 0;
}


/* ═══════════════════════════════════════════
CALCULATE PACK SOC
   CALCULATE PACK SOC
═══════════════════════════════════════════ */

function calculatePackSOC(
cells
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
  return calculateEstimatedSOCFromCellVoltage(
    averageCellVoltage
  );
}


/* ═══════════════════════════════════════════
GET CELL DATA FOR ALL 8 PACKS
   GET CELL DATA FOR ALL 8 PACKS
═══════════════════════════════════════════ */

async function getAllPackData() {

const requests =
PACKS.map(
async pack => {

    const table =
      PACK_TABLES[pack];
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

    if (error) {
          console.error(
            pack +
            " ERROR:",
            error
          );

      console.error(
        pack +
        " ERROR:",
        error
      );
          return;
        }

      return;
    }
        if (
          data &&
          data.length > 0
        ) {

    if (
      data &&
      data.length > 0
    ) {
          const row =
            data[0];

      const row =
        data[0];
          const cells = [];

      const cells = [];
          for (
            let i = 1;
            i <= 16;
            i++
          ) {

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

        const value =
          parseFloat(
            row[
              `Cell_${i}`
            ]
          );
            if (
              Number.isFinite(value)
            ) {

        if (
          Number.isFinite(value)
        ) {
              cells.push(
                value
              );

          cells.push(
            value
          );
            } else {

        } else {
              cells.push(0);

          cells.push(0);
            }
          }

        }
      }
          /*
             Cell values in Supabase
             are stored in VOLTS.

      /*
         Cell values in Supabase
         are stored in VOLTS.
             Pack voltage =
             sum of 16 cell voltages.
          */

         Pack voltage =
         sum of 16 cell voltages.
      */
          const packVoltage =
            cells.reduce(
              (sum, value) =>
                sum + value,
              0
            );

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
          const estimatedSOC =
            calculatePackSOC(
              cells
            );

      PACK_DATA[pack] = {
          PACK_DATA[pack] = {

        cells:
          cells,
            cells:
              cells,

        voltage:
          packVoltage,
            voltage:
              packVoltage,

        averageCellVoltage:
          averageCellVoltage,
            averageCellVoltage:
              averageCellVoltage,

        soc:
          estimatedSOC,
            soc:
              estimatedSOC,

        created_at:
          row.created_at
            created_at:
              row.created_at

      };
    }
  }
);
          };
        }
      }
    );

await Promise.all(
requests
);
  await Promise.all(
    requests
  );

/*
Voltage/SOC chart ALWAYS
shows all available packs.
*/
  /*
     Voltage/SOC chart ALWAYS
     shows all available packs.
  */

buildBarChart();
  buildBarChart();

/*
Update the currently selected
heat-map pack.
*/
  /*
     Update the currently selected
     heat-map pack.
  */

buildHeatmap();
  buildHeatmap();
}


/* ═══════════════════════════════════════════
SAFE VALUE SETTER
   SAFE VALUE SETTER
═══════════════════════════════════════════ */

function setValue(
id,
value
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
  const el =
    document.getElementById(id);

el.textContent = "--";
  if (!el) {
    return;
  }

return;
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

}
    el.textContent = "--";

const number =
Number(value);
    return;
  }

if (
Number.isFinite(number)
) {
  const number =
    Number(value);

el.textContent =
  number.toFixed(1);
  if (
    Number.isFinite(number)
  ) {

} else {
    el.textContent =
      number.toFixed(1);

el.textContent =
  value;
  } else {

    el.textContent =
      value;
  }
}
}


/* ═══════════════════════════════════════════
KPI STATUS
   KPI STATUS
═══════════════════════════════════════════ */

function updateKPIStatus(
current
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
  const currTrend =
    document.getElementById(
      "kpi-current-trend"
    );

if (
!currTrend ||
!powTrend
) {
return;
}
  const powTrend =
    document.getElementById(
      "kpi-power-trend"
    );

if (
Number(current) > 0
) {
  if (
    !currTrend ||
    !powTrend
  ) {
    return;
  }

currTrend.textContent =
  "Charging";
  if (
    Number(current) > 0
  ) {

currTrend.className =
  "kpi-trend up";
    currTrend.textContent =
      "Charging";

powTrend.textContent =
  "Charging";
    currTrend.className =
      "kpi-trend up";

powTrend.className =
  "kpi-trend up";
    powTrend.textContent =
      "Charging";

}
    powTrend.className =
      "kpi-trend up";

else if (
Number(current) < 0
) {
  }

currTrend.textContent =
  "Discharging";
  else if (
    Number(current) < 0
  ) {

currTrend.className =
  "kpi-trend down";
    currTrend.textContent =
      "Discharging";

powTrend.textContent =
  "Discharging";
    currTrend.className =
      "kpi-trend down";

powTrend.className =
  "kpi-trend down";
    powTrend.textContent =
      "Discharging";

}
    powTrend.className =
      "kpi-trend down";

else {
  }

currTrend.textContent =
  "Idle";
  else {

currTrend.className =
  "kpi-trend";
    currTrend.textContent =
      "Idle";

powTrend.textContent =
  "Idle";
    currTrend.className =
      "kpi-trend";

powTrend.className =
  "kpi-trend";
    powTrend.textContent =
      "Idle";

}
    powTrend.className =
      "kpi-trend";
  }
}


/* ═══════════════════════════════════════════
SELECTED PACK
USED ONLY BY CELL HEAT MAP
   SELECTED PACK
   USED ONLY BY CELL HEAT MAP
═══════════════════════════════════════════ */

function getSelectedPack() {

const selector =
document.getElementById(
"sel-pack"
);
  const selector =
    document.getElementById(
      "sel-pack"
    );

if (!selector) {
return "Pack 1";
}
  if (!selector) {
    return "Pack 1";
  }

if (
PACKS.includes(
selector.value
)
) {
  if (
    PACKS.includes(
      selector.value
    )
  ) {

return selector.value;
    return selector.value;

}
  }

return "Pack 1";
  return "Pack 1";
}


/* ═══════════════════════════════════════════
PACK DISPLAY
INTENTIONALLY EMPTY
   PACK DISPLAY
   INTENTIONALLY EMPTY

The Voltage & SOC chart is NOT controlled
by the pack selector.
   The Voltage & SOC chart is NOT controlled
   by the pack selector.
═══════════════════════════════════════════ */

function updateSelectedPackDisplay() {

/*
Intentionally empty.
  /*
     Intentionally empty.

 Pack selector is ONLY for
 Cell Voltage Heat Map.
     Pack selector is ONLY for
     Cell Voltage Heat Map.

 Battery Voltage & SOC chart
 always displays all 8 packs.

*/
     Battery Voltage & SOC chart
     always displays all 8 packs.
  */

}


/* ═══════════════════════════════════════════
FILTER CHANGE
ONLY HEAT MAP CHANGES
   FILTER CHANGE
   ONLY HEAT MAP CHANGES
═══════════════════════════════════════════ */

function onFilterChange() {

/*
IMPORTANT:
  /*
     IMPORTANT:

 Do NOT rebuild the bar chart here.
     Do NOT rebuild the bar chart here.

 The Voltage & SOC chart must
 always remain All 8 Packs.
     The Voltage & SOC chart must
     always remain All 8 Packs.

 Only the Cell Voltage Heat Map
 changes when Pack selection changes.
     Only the Cell Voltage Heat Map
     changes when Pack selection changes.
  */

*/

buildHeatmap();
  buildHeatmap();
}


/* ═══════════════════════════════════════════
LINE CHART
OVERALL SYSTEM DATA
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
  const ctx =
    document.getElementById(
      "lineChart"
    );

lineChart.destroy();
  if (!ctx) {
    return;
  }

lineChart = null;
  if (lineChart) {

}
    lineChart.destroy();

if (!BMS_DATA.length) {
return;
}
    lineChart = null;
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
  if (!BMS_DATA.length) {
    return;
  }

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

lineChart =
new Chart(
ctx,
{
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

    type:
      "line",
  lineChart =
    new Chart(
      ctx,
      {

    data: {
        type:
          "line",

      labels:
        labels,
        data: {

      datasets: [
          labels:
            labels,

        {
          datasets: [

          label:
            "Charge/Discharge Power (kW)",
            {

          data:
            powerValues,
              label:
                "Charge/Discharge Power (kW)",

          borderColor:
            "#FF924C",
              data:
                powerValues,

          backgroundColor:
            "rgba(255,146,76,0.08)",
              borderColor:
                "#FF924C",

          borderWidth:
            2,
              backgroundColor:
                "rgba(255,146,76,0.08)",

          fill:
            true,
              borderWidth:
                2,

          tension:
            0.4,
              fill:
                true,

          pointRadius:
            2
              tension:
                0.4,

        },
              pointRadius:
                2

        {
            },

          label:
            "PV Input (kW)",
            {

          data:
            pvValues,
              label:
                "PV Input (kW)",

          borderColor:
            "#3FB950",
              data:
                pvValues,

          backgroundColor:
            "rgba(63,185,80,0.08)",
              borderColor:
                "#3FB950",

          borderWidth:
            2,
              backgroundColor:
                "rgba(63,185,80,0.08)",

          fill:
            true,
              borderWidth:
                2,

          tension:
            0.4,
              fill:
                true,

          pointRadius:
            2
              tension:
                0.4,

        }
              pointRadius:
                2

      ]
    },
            }

    options: {
          ]
        },

      ...CHART_DEFAULTS,
        options: {

      aspectRatio:
        2
    }
          ...CHART_DEFAULTS,

  }
);
          aspectRatio:
            2
        }

      }
    );
}


/* ═══════════════════════════════════════════
BATTERY VOLTAGE & SOC
ALWAYS ALL 8 PACKS
   BATTERY VOLTAGE & SOC
   ALWAYS ALL 8 PACKS
═══════════════════════════════════════════ */

function buildBarChart() {

const ctx =
document.getElementById(
"barChart"
);

if (!ctx) {
return;
}
  const ctx =
    document.getElementById(
      "barChart"
    );

if (barChart) {
  if (!ctx) {
    return;
  }

barChart.destroy();
  if (barChart) {

barChart = null;
    barChart.destroy();

}
    barChart = null;
  }

/*
ALWAYS show all 8 packs.
  /*
     ALWAYS show all 8 packs.

 The heat-map selector has absolutely
 NO effect on this chart.
     The heat-map selector has absolutely
     NO effect on this chart.
  */

*/
  const packsToShow =
    PACKS.filter(
      pack =>
        PACK_DATA[pack]
    );

const packsToShow =
PACKS.filter(
pack =>
PACK_DATA[pack]
);
  if (
    !packsToShow.length
  ) {
    return;
  }

if (
!packsToShow.length
) {
return;
}
  const labels =
    packsToShow;

const labels =
packsToShow;
  const voltage =
    packsToShow.map(
      pack =>
        Number(
          PACK_DATA[pack]
            ?.voltage || 0
        )
    );

const voltage =
packsToShow.map(
pack =>
Number(
PACK_DATA[pack]
?.voltage || 0
)
);
  const soc =
    packsToShow.map(
      pack =>
        Number(
          PACK_DATA[pack]
            ?.soc || 0
        )
    );

const soc =
packsToShow.map(
pack =>
Number(
PACK_DATA[pack]
?.soc || 0
)
);
  const voltageColors = [

const voltageColors = [
    "#FF924C",
    "#A7B89C",
    "#E0A25B",
    "#D75B5B",
    "#E57A2A",
    "#3FB950",
    "#6B8E23",
    "#8A6FDF"

"#FF924C",
"#A7B89C",
"#E0A25B",
"#D75B5B",
"#E57A2A",
"#3FB950",
"#6B8E23",
"#8A6FDF"
  ];

];
  barChart =
    new Chart(
      ctx,
      {

barChart =
new Chart(
ctx,
{
        type:
          "bar",

    type:
      "bar",
        data: {

    data: {
          labels:
            labels,

      labels:
        labels,
          datasets: [

      datasets: [
            {

        {
              label:
                "Voltage (V)",

          label:
            "Voltage (V)",
              data:
                voltage,

          data:
            voltage,
              backgroundColor:
                packsToShow.map(
                  pack =>
                    voltageColors[
                      PACKS.indexOf(
                        pack
                      )
                    ]
                ),

          backgroundColor:
            packsToShow.map(
              pack =>
                voltageColors[
                  PACKS.indexOf(
                    pack
                  )
                ]
            ),
              borderRadius:
                6,

          borderRadius:
            6,
              yAxisID:
                "y"

          yAxisID:
            "y"
            },

        },
            {

        {
              label:
                "SOC (%)",

          label:
            "SOC (%)",
              data:
                soc,

          data:
            soc,
              backgroundColor:
                "rgba(167,184,156,0.5)",

          backgroundColor:
            "rgba(167,184,156,0.5)",
              borderRadius:
                6,

          borderRadius:
            6,
              yAxisID:
                "y1"

          yAxisID:
            "y1"
            }

        }
          ]
        },

      ]
    },
        options: {

    options: {
          ...CHART_DEFAULTS,

      ...CHART_DEFAULTS,
          aspectRatio:
            2,

      aspectRatio:
        2,
          plugins: {

      plugins: {
            ...CHART_DEFAULTS.plugins,

        ...CHART_DEFAULTS.plugins,
            title: {

        title: {
              display:
                true,

          display:
            true,
              text:
                "Battery Voltage & Estimated SOC — All Packs",

          text:
            "Battery Voltage & Estimated SOC — All Packs",
              font: {

          font: {
                family:
                  "Inter",

            family:
              "Inter",
                size:
                  13,

            size:
              13,
                weight:
                  "600"
              },

            weight:
              "600"
              color:
                "#4A4A4A"
            }
          },

          color:
            "#4A4A4A"
        }
      },
          scales: {

      scales: {
            x: {

        x: {
              grid: {

          grid: {
                color:
                  "#E0E0E0"
              },

            color:
              "#E0E0E0"
          },
              ticks: {

          ticks: {
                font: {

            font: {
                  family:
                    "Inter",

              family:
                "Inter",
                  size:
                    11
                },

              size:
                11
                color:
                  "#6B6B6B"
              }
            },

            color:
              "#6B6B6B"
          }
        },
            y: {

        y: {
              grid: {

          grid: {
                color:
                  "#E0E0E0"
              },

            color:
              "#E0E0E0"
          },
              ticks: {

          ticks: {
                font: {

            font: {
                  family:
                    "Inter",

              family:
                "Inter",
                  size:
                    11
                },

              size:
                11
            },
                color:
                  "#6B6B6B"
              },

            color:
              "#6B6B6B"
          },
              position:
                "left",

          position:
            "left",
              beginAtZero:
                false
            },

          beginAtZero:
            false
        },
            y1: {

        y1: {
              grid: {

          grid: {
                display:
                  false
              },

            display:
              false
          },
              ticks: {

          ticks: {
                font: {

            font: {
                  family:
                    "Inter",

              family:
                "Inter",
                  size:
                    11
                },

              size:
                11
            },
                color:
                  "#6B6B6B"
              },

            color:
              "#6B6B6B"
          },
              position:
                "right",

              min:
                0,

          position:
            "right",
              max:
                100
            }

          min:
            0,
          }

          max:
            100
        }

      }

    }

  }
);

    );
}


/* ═══════════════════════════════════════════
CHART DEFAULTS
   CHART DEFAULTS
═══════════════════════════════════════════ */

const CHART_DEFAULTS = {

responsive:
true,
  responsive:
    true,

maintainAspectRatio:
true,
  maintainAspectRatio:
    true,

plugins: {
  plugins: {

legend: {
    legend: {

  labels: {
      labels: {

    font: {
        font: {

      family:
        "Inter",
          family:
            "Inter",

      size:
        11
    },
          size:
            11
        },

    color:
      "#6B6B6B",
        color:
          "#6B6B6B",

    boxWidth:
      12
  }
}
        boxWidth:
          12
      }
    }

},
  },

scales: {
  scales: {

x: {
    x: {

  grid: {
      grid: {

    color:
      "#E0E0E0"
  },
        color:
          "#E0E0E0"
      },

  ticks: {
      ticks: {

    font: {
        font: {

      family:
        "Inter",
          family:
            "Inter",

      size:
        11
    },
          size:
            11
        },

    color:
      "#6B6B6B"
  }
        color:
          "#6B6B6B"
      }

},
    },

y: {
    y: {

  grid: {
      grid: {

    color:
      "#E0E0E0"
  },
        color:
          "#E0E0E0"
      },

  ticks: {
      ticks: {

    font: {
        font: {

      family:
        "Inter",
          family:
            "Inter",

      size:
        11
    },
          size:
            11
        },

    color:
      "#6B6B6B"
  }
        color:
          "#6B6B6B"
      }

}
    }

}
  }

};


/* ═══════════════════════════════════════════
CELL VOLTAGE HEAT MAP
SINGLE PACK ONLY
   CELL VOLTAGE HEAT MAP
   SINGLE PACK ONLY
═══════════════════════════════════════════ */

function buildHeatmap() {

const grid =
document.getElementById(
"hm-grid"
);
  const grid =
    document.getElementById(
      "hm-grid"
    );

if (!grid) {
return;
}
  if (!grid) {
    return;
  }

grid.innerHTML =
"";
  grid.innerHTML =
    "";

/*
SINGLE PACK ONLY.
  /*
     SINGLE PACK ONLY.

 There is NO "All Packs"
 mode anymore.
     There is NO "All Packs"
     mode anymore.
  */

*/
  const selected =
    getSelectedPack();

const selected =
getSelectedPack();
  const pack =
    PACK_DATA[selected];

const pack =
PACK_DATA[selected];
  if (!pack) {

if (!pack) {
    grid.innerHTML =
      "<div style='padding:20px'>No cell data available.</div>";

grid.innerHTML =
  "<div style='padding:20px'>No cell data available.</div>";
    return;
  }

return;
  const cells =
    pack.cells || [];

}
  /*
     Always render exactly
     16 cells.
  */

const cells =
pack.cells || [];
  for (
    let i = 0;
    i < 16;
    i++
  ) {

/*
Always render exactly
16 cells.
*/
    const v =
      Number(
        cells[i] || 0
      );

for (
let i = 0;
i < 16;
i++
) {
    let status;

const v =
  Number(
    cells[i] || 0
  );
    /*
       Sodium-ion thresholds:

let status;
       Alert:
       < 1.5V or > 3.5V

/*
   Sodium-ion thresholds:
       Caution:
       1.5–1.7V
       3.4–3.5V

   Alert:
   < 1.5V or > 3.5V
       Balanced:
       1.7–3.4V
    */

   Caution:
   1.5–1.7V
   3.4–3.5V
    if (
      v < 1.5 ||
      v > 3.5
    ) {

   Balanced:
   1.7–3.4V
*/
      status =
        "alert";

if (
  v < 1.5 ||
  v > 3.5
) {
    }

  status =
    "alert";
    else if (
      v < 1.7 ||
      v > 3.4
    ) {

}
      status =
        "caution";

else if (
  v < 1.7 ||
  v > 3.4
) {

  status =
    "caution";

}
    }

else {
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
      status =
        "balanced";
    }

const el =
  document.createElement(
    "div"
  );
    const bg =
      status === "alert"
        ? "#D75B5B"
        : status === "caution"
        ? "#E0A25B"
        : "#A7B89C";

el.className =
  "hm-zone";
    const el =
      document.createElement(
        "div"
      );

el.style.background =
  bg;
    el.className =
      "hm-zone";

el.innerHTML = `
    el.style.background =
      bg;

  <div class="z-name">
    Cell ${i + 1}
  </div>
    el.innerHTML = `

  <div class="z-kwh">
    ${v.toFixed(3)}V
  </div>
      <div class="z-name">
        Cell ${i + 1}
      </div>

  <div class="z-tip">
      <div class="z-kwh">
        ${v.toFixed(3)}V
      </div>

    <strong>
      ${selected} — Cell ${i + 1}
    </strong>
      <div class="z-tip">

    <br>
        <strong>
          ${selected} — Cell ${i + 1}
        </strong>

    Voltage:
    <strong>
      ${v.toFixed(3)}V
    </strong>
        <br>

    <br>
        Voltage:
        <strong>
          ${v.toFixed(3)}V
        </strong>

    Status:
    <strong>
      ${status}
    </strong>
        <br>

  </div>
        Status:
        <strong>
          ${status}
        </strong>

`;
      </div>

grid.appendChild(
  el
);
    `;

}
    grid.appendChild(
      el
    );
  }

const title =
document.querySelector(
"#tab-heatmap .card-title"
);
  const title =
    document.querySelector(
      "#tab-heatmap .card-title"
    );

if (title) {
  if (title) {

title.textContent =
  `Cell Voltage Heat Map — ${selected}`;
    title.textContent =
      `Cell Voltage Heat Map — ${selected}`;

  }
}
}


/* ═══════════════════════════════════════════
TRENDS
   TRENDS
═══════════════════════════════════════════ */

function setRange(
range,
btn
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
  currentRange =
    range;

if (btn) {
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

btn.classList.add(
  "active"
);
  if (btn) {

}
    btn.classList.add(
      "active"
    );
  }

buildTrendChart(
range
);
  buildTrendChart(
    range
  );
}


function buildTrendChart(
range
  range
) {

const ctx =
document.getElementById(
"trendChart"
);
  const ctx =
    document.getElementById(
      "trendChart"
    );

if (!ctx) {
return;
}
  if (!ctx) {
    return;
  }

if (trendChart) {
  if (trendChart) {

trendChart.destroy();
    trendChart.destroy();

trendChart = null;
    trendChart = null;
  }

}
  if (!BMS_DATA.length) {
    return;
  }

if (!BMS_DATA.length) {
return;
}
  const data =
    BMS_DATA
      .slice()
      .reverse();

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
  trendChart =
    new Chart(
      ctx,
      {

    type:
      "line",
        type:
          "line",

    data: {
        data: {

      labels:
        labels,
          labels:
            labels,

      datasets: [
          datasets: [

        {
            {

          label:
            "Power (kW)",
              label:
                "Power (kW)",

          data:
            power,
              data:
                power,

          borderColor:
            "#FF924C",
              borderColor:
                "#FF924C",

          backgroundColor:
            "rgba(255,146,76,0.06)",
              backgroundColor:
                "rgba(255,146,76,0.06)",

          borderWidth:
            2,
              borderWidth:
                2,

          fill:
            true,
              fill:
                true,

          tension:
            0.35,
              tension:
                0.35,

          yAxisID:
            "y"
              yAxisID:
                "y"

        },
            },

        {
            {

          label:
            "SOC (%)",
              label:
                "SOC (%)",

          data:
            soc,
              data:
                soc,

          borderColor:
            "#A7B89C",
              borderColor:
                "#A7B89C",

          borderWidth:
            2,
              borderWidth:
                2,

          fill:
            false,
              fill:
                false,

          tension:
            0.35,
              tension:
                0.35,

          yAxisID:
            "y1"
              yAxisID:
                "y1"

        }
            }

      ]
    },
          ]
        },

    options: {
        options: {

      ...CHART_DEFAULTS,
          ...CHART_DEFAULTS,

      aspectRatio:
        2.8,
          aspectRatio:
            2.8,

      scales: {
          scales: {

        x: {
            x: {

          grid: {
              grid: {

            color:
              "#E0E0E0"
          }
                color:
                  "#E0E0E0"
              }

        },
            },

        y: {
            y: {

          position:
            "left"
        },
              position:
                "left"
            },

            y1: {

              position:
                "right",

        y1: {
              max:
                100,

          position:
            "right",
              grid: {

          max:
            100,
                display:
                  false
              }

          grid: {
            }

            display:
              false
          }

        }

      }

    }

  }
);

    );
}


/* ═══════════════════════════════════════════
ALERTS
   ALERTS
═══════════════════════════════════════════ */

const ALERTS = [

{
  {

id:
  "a1",
    id:
      "a1",

sev:
  "critical",
    sev:
      "critical",

title:
  "Cell Voltage Imbalance Detected",
    title:
      "Cell Voltage Imbalance Detected",

equip:
  "Pack 3 — Cell 12",
    equip:
      "Pack 3 — Cell 12",

time:
  15,
    time:
      15,

threshold:
  3.35,
    threshold:
      3.35,

current:
  3.58,
    current:
      3.58,

desc:
  "Cell voltage exceeds the safe threshold. Immediate balancing required."
    desc:
      "Cell voltage exceeds the safe threshold. Immediate balancing required."

},
  },

{
  {

id:
  "a2",
    id:
      "a2",

sev:
  "warning",
    sev:
      "warning",

title:
  "High Temperature Warning",
    title:
      "High Temperature Warning",

equip:
  "BMS Temperature Sensor",
    equip:
      "BMS Temperature Sensor",

time:
  45,
    time:
      45,

threshold:
  35,
    threshold:
      35,

current:
  39,
    current:
      39,

desc:
  "Battery temperature elevated. Check cooling system."
    desc:
      "Battery temperature elevated. Check cooling system."

}
  }

];


const SEV_ICON = {

critical:
"🔴",
  critical:
    "🔴",

warning:
"⚠️",
  warning:
    "⚠️",

info:
"ℹ️"
  info:
    "ℹ️"

};


const SEV_CLASS = {

critical:
"sev-critical",
  critical:
    "sev-critical",

warning:
"sev-warning",
  warning:
    "sev-warning",

info:
"sev-info"
  info:
    "sev-info"

};


const SEV_LABEL = {

critical:
"Critical",
  critical:
    "Critical",

warning:
"Warning",
  warning:
    "Warning",

info:
"Info"
  info:
    "Info"

};

function fmtTime(
mins
) {

if (
mins < 60
function fmtTime(
  mins
) {

return (
  `${mins}m ago`
);
  if (
    mins < 60
  ) {

}
    return (
      `${mins}m ago`
    );
  }

return (
${Math.floor(
  return (
    `${Math.floor(
      mins / 60
    )}h ago
);
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
function buildAlerts() {

const critCount =
ALERTS.filter(
a =>
a.sev ===
"critical"
).length;
  const list =
    document.getElementById(
      "alerts-list"
    );

const badge =
document.getElementById(
"crit-badge"
);
  if (!list) {
    return;
  }

if (badge) {
  const critCount =
    ALERTS.filter(
      a =>
        a.sev ===
        "critical"
    ).length;

badge.textContent =
  `${critCount} Critical`;
  const badge =
    document.getElementById(
      "crit-badge"
    );

}
  if (badge) {

list.innerHTML =
ALERTS.map(
a => `
    badge.textContent =
      `${critCount} Critical`;
  }

    <div class="acc-item">
  list.innerHTML =
    ALERTS.map(
      a => `

      <button
        class="acc-trigger"
        onclick="toggleAcc('${a.id}')"
      >
        <div class="acc-item">

        <span class="acc-sev-icon">
          ${SEV_ICON[a.sev]}
        </span>
          <button
            class="acc-trigger"
            onclick="toggleAcc('${a.id}')"
          >

        <div class="acc-meta">
            <span class="acc-sev-icon">
              ${SEV_ICON[a.sev]}
            </span>

          <div class="acc-meta-row">
            <div class="acc-meta">

            <span class="acc-title">
              ${a.title}
            </span>
              <div class="acc-meta-row">

            <span
              class="sev-badge ${SEV_CLASS[a.sev]}"
            >
              ${SEV_LABEL[a.sev]}
            </span>
                <span class="acc-title">
                  ${a.title}
                </span>

          </div>
                <span
                  class="sev-badge ${SEV_CLASS[a.sev]}"
                >
                  ${SEV_LABEL[a.sev]}
                </span>

          <div class="acc-sub">
            ${a.equip}
          </div>
              </div>

          <div class="acc-sub">
            ${fmtTime(a.time)}
          </div>
              <div class="acc-sub">
                ${a.equip}
              </div>

        </div>
              <div class="acc-sub">
                ${fmtTime(a.time)}
              </div>

        <span
          class="acc-chevron"
          id="chev-${a.id}"
        >
          ▾
        </span>
            </div>

      </button>
            <span
              class="acc-chevron"
              id="chev-${a.id}"
            >
              ▾
            </span>

      <div
        class="acc-body"
        id="body-${a.id}"
      >
          </button>

        <p>
          ${a.desc}
        </p>
          <div
            class="acc-body"
            id="body-${a.id}"
          >

      </div>
            <p>
              ${a.desc}
            </p>

    </div>
          </div>

  `
).join("");
        </div>

      `
    ).join("");
}


/* ═══════════════════════════════════════════
REPORTS
   REPORTS
═══════════════════════════════════════════ */

const REPORTS = [

{
  {

id:
  "r1",
    id:
      "r1",

title:
  "Battery Health Summary",
    title:
      "Battery Health Summary",

summary:
  "Overall system battery monitoring",
    summary:
      "Overall system battery monitoring",

details: [
    details: [

  "Monitoring all 8 battery packs",
      "Monitoring all 8 battery packs",

  "Cell voltage data received from RBMS",
      "Cell voltage data received from RBMS",

  "Pack-level voltage calculated from cell data"
      "Pack-level voltage calculated from cell data"

],
    ],

recs: [
    recs: [

  "Monitor cell voltage imbalance",
      "Monitor cell voltage imbalance",

  "Investigate abnormal cells",
      "Investigate abnormal cells",

  "Maintain regular balancing"
      "Maintain regular balancing"

]
    ]

}
  }

];


function buildReports() {

const list =
document.getElementById(
"reports-list"
);
  const list =
    document.getElementById(
      "reports-list"
    );

if (!list) {
return;
}
  if (!list) {
    return;
  }

list.innerHTML =
REPORTS.map(
r => `
  list.innerHTML =
    REPORTS.map(
      r => `

    <div class="acc-item">
        <div class="acc-item">

      <button
        class="acc-trigger"
        onclick="toggleAcc('${r.id}')"
      >
          <button
            class="acc-trigger"
            onclick="toggleAcc('${r.id}')"
          >

        <span class="acc-sev-icon">
          📋
        </span>
            <span class="acc-sev-icon">
              📋
            </span>

        <div class="acc-meta">
            <div class="acc-meta">

          <div class="acc-title">
            ${r.title}
          </div>
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
              <div
                class="acc-sub"
                style="margin-top:3px"
              >
                ${r.summary}
              </div>

        <span
          class="acc-chevron"
          id="chev-${r.id}"
        >
          ▾
        </span>
            </div>

      </button>
            <span
              class="acc-chevron"
              id="chev-${r.id}"
            >
              ▾
            </span>

      <div
        class="acc-body"
        id="body-${r.id}"
      >
          </button>

        <div class="acc-recs">
          <div
            class="acc-body"
            id="body-${r.id}"
          >

          <div class="acc-recs-title">
            ✅ Key Findings
          </div>
            <div class="acc-recs">

          <ul>
              <div class="acc-recs-title">
                ✅ Key Findings
              </div>

            ${
              r.details
                .map(
                  d =>
                    `<li>${d}</li>`
                )
                .join("")
            }
              <ul>

          </ul>
                ${
                  r.details
                    .map(
                      d =>
                        `<li>${d}</li>`
                    )
                    .join("")
                }

        </div>
              </ul>

        <div
          class="acc-recs"
          style="margin-top:10px"
        >
            </div>

          <div class="acc-recs-title">
            💡 Recommendations
          </div>
            <div
              class="acc-recs"
              style="margin-top:10px"
            >

          <ul>
              <div class="acc-recs-title">
                💡 Recommendations
              </div>

            ${
              r.recs
                .map(
                  item =>
                    `<li>${item}</li>`
                )
                .join("")
            }
              <ul>

          </ul>
                ${
                  r.recs
                    .map(
                      item =>
                        `<li>${item}</li>`
                    )
                    .join("")
                }

        </div>
              </ul>

      </div>
            </div>

    </div>
          </div>

  `
).join("");
        </div>

      `
    ).join("");
}


/* ═══════════════════════════════════════════
ACCORDION
   ACCORDION
═══════════════════════════════════════════ */

function toggleAcc(
id
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
  const body =
    document.getElementById(
      "body-" + id
    );

if (!body) {
return;
}
  const chev =
    document.getElementById(
      "chev-" + id
    );

const open =
body.classList.toggle(
"open"
);
  if (!body) {
    return;
  }

if (chev) {
  const open =
    body.classList.toggle(
      "open"
    );

chev.classList.toggle(
  "open",
  open
);
  if (chev) {

    chev.classList.toggle(
      "open",
      open
    );
  }
}
}


/* ═══════════════════════════════════════════
LOCATION
   LOCATION
═══════════════════════════════════════════ */

function clearLocation() {

selectedLocation =
"";
  selectedLocation =
    "";

const pill =
document.getElementById(
"loc-pill"
);
  const pill =
    document.getElementById(
      "loc-pill"
    );

if (pill) {
  if (pill) {

pill.classList.add(
  "hidden"
);
    pill.classList.add(
      "hidden"
    );
  }

  onFilterChange();
}

onFilterChange();
}

function setLocation(
loc
  loc
) {

selectedLocation =
loc;
  selectedLocation =
    loc;

const label =
document.getElementById(
"loc-label"
);
  const label =
    document.getElementById(
      "loc-label"
    );

const pill =
document.getElementById(
"loc-pill"
);
  const pill =
    document.getElementById(
      "loc-pill"
    );

if (label) {
  if (label) {

label.textContent =
  loc;
    label.textContent =
      loc;
  }

}
  if (pill) {

if (pill) {
    pill.classList.remove(
      "hidden"
    );
  }

pill.classList.remove(
  "hidden"
);
  showToast(
    `Filter Applied: ${loc}`
  );

  onFilterChange();
}

showToast(
Filter Applied: ${loc}
);

onFilterChange();
}

/* ═══════════════════════════════════════════
TOAST
   TOAST
═══════════════════════════════════════════ */

function showToast(
msg
  msg
) {

const t =
document.getElementById(
"toast"
);
  const t =
    document.getElementById(
      "toast"
    );

if (!t) {
return;
}
  if (!t) {
    return;
  }

t.textContent =
msg;
  t.textContent =
    msg;

t.classList.remove(
"hidden"
);
  t.classList.remove(
    "hidden"
  );

clearTimeout(
toastTimer
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
   TABS
═══════════════════════════════════════════ */

function switchTab(
name,
btn
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

const panel =
document.getElementById(
"tab-" + name
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

if (panel) {
  const panel =
    document.getElementById(
      "tab-" + name
    );

panel.classList.remove(
  "hidden"
);
  if (panel) {

}
    panel.classList.remove(
      "hidden"
    );
  }

if (btn) {
  if (btn) {

btn.classList.add(
  "active"
);
    btn.classList.add(
      "active"
    );
  }

}
  if (
    name ===
    "heatmap"
  ) {

if (
name ===
"heatmap"
) {
    buildHeatmap();
  }

buildHeatmap();
  if (
    name ===
    "trends"
  ) {

    buildTrendChart(
      currentRange
    );
  }
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
AUTH
   AUTH
═══════════════════════════════════════════ */

const USERS = {

admin:
"admin123",
  admin:
    "admin123",

sodion:
"sodion123",
  sodion:
    "sodion123",

operator:
"op2024"
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
  const username =
    document
      .getElementById(
        "username"
      )
      .value
      .trim();

if (
USERS[username] &&
USERS[username] ===
password
) {
  const password =
    document
      .getElementById(
        "password"
      )
      .value;

if (err) {
  const err =
    document.getElementById(
      "login-error"
    );

  err.classList.add(
    "hidden"
  );
}
  if (
    USERS[username] &&
    USERS[username] ===
      password
  ) {

const chip =
  document.getElementById(
    "user-chip"
  );
    if (err) {

if (chip) {
      err.classList.add(
        "hidden"
      );
    }

  chip.textContent =
    username[0]
      .toUpperCase();
}
    const chip =
      document.getElementById(
        "user-chip"
      );

document
  .getElementById(
    "login-page"
  )
  .classList.remove(
    "active"
  );
    if (chip) {

document
  .getElementById(
    "dashboard-page"
  )
  .classList.add(
    "active"
  );
      chip.textContent =
        username[0]
          .toUpperCase();
    }

initDashboard();
    document
      .getElementById(
        "login-page"
      )
      .classList.remove(
        "active"
      );

}
    document
      .getElementById(
        "dashboard-page"
      )
      .classList.add(
        "active"
      );

else {
    initDashboard();

if (err) {
  }

  err.classList.remove(
    "hidden"
  );
}
  else {

}
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
function logout() {

const loginPage =
document.getElementById(
"login-page"
);
  const dashboard =
    document.getElementById(
      "dashboard-page"
    );

if (dashboard) {
  const loginPage =
    document.getElementById(
      "login-page"
    );

dashboard.classList.remove(
  "active"
);
  if (dashboard) {

}
    dashboard.classList.remove(
      "active"
    );
  }

if (loginPage) {
  if (loginPage) {

loginPage.classList.add(
  "active"
);
    loginPage.classList.add(
      "active"
    );
  }

}
  const username =
    document.getElementById(
      "username"
    );

const username =
document.getElementById(
"username"
);
  const password =
    document.getElementById(
      "password"
    );

const password =
document.getElementById(
"password"
);
  if (username) {
    username.value = "";
  }

if (username) {
username.value = "";
}
  if (password) {
    password.value = "";
  }

if (password) {
password.value = "";
  destroyCharts();
}

destroyCharts();
}

/* ═══════════════════════════════════════════
CLOCK
   CLOCK
═══════════════════════════════════════════ */

setInterval(
() => {
  () => {

const n =
  new Date();
    const n =
      new Date();

const pad =
  v =>
    String(v)
      .padStart(
        2,
        "0"
      );
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
    const clock =
      document.getElementById(
        "clock"
      );

if (clock) {
    if (clock) {

  clock.textContent =
    `${pad(n.getHours())}:` +
    `${pad(n.getMinutes())}:` +
    `${pad(n.getSeconds())}`;
      clock.textContent =
        `${pad(n.getHours())}:` +
        `${pad(n.getMinutes())}:` +
        `${pad(n.getSeconds())}`;

}
    }

},
1000
  },
  1000
);


/* ═══════════════════════════════════════════
DESTROY CHARTS
   DESTROY CHARTS
═══════════════════════════════════════════ */

function destroyCharts() {

[
lineChart,
barChart,
trendChart
].forEach(
chart => {
  [
    lineChart,
    barChart,
    trendChart
  ].forEach(
    chart => {

  if (chart) {
      if (chart) {

    chart.destroy();
  }

}
        chart.destroy();
      }

);
    }
  );

lineChart =
null;
  lineChart =
    null;

barChart =
null;
  barChart =
    null;

trendChart =
null;
  trendChart =
    null;
}


/* ═══════════════════════════════════════════
PACK SELECTOR
PACK 1–8 ONLY
NO "ALL PACKS"
   PACK SELECTOR
   PACK 1–8 ONLY
   NO "ALL PACKS"
═══════════════════════════════════════════ */

function ensurePackSelectorOptions() {

const selector =
document.getElementById(
"sel-pack"
);
  const selector =
    document.getElementById(
      "sel-pack"
    );

if (!selector) {
return;
}
  if (!selector) {
    return;
  }

const currentValue =
selector.value;
  const currentValue =
    selector.value;

/*
Completely rebuild selector.
  /*
     Completely rebuild selector.

 This guarantees that an old
 "All Packs" option from the HTML
 is removed.
     This guarantees that an old
     "All Packs" option from the HTML
     is removed.
  */

*/
  selector.innerHTML =
    "";

selector.innerHTML =
"";
  PACKS.forEach(
    pack => {

PACKS.forEach(
pack => {
      const option =
        document.createElement(
          "option"
        );

  const option =
    document.createElement(
      "option"
    );
      option.value =
        pack;

  option.value =
    pack;
      option.textContent =
        pack;

  option.textContent =
    pack;
      selector.appendChild(
        option
      );

  selector.appendChild(
    option
    }
  );

}
  if (
    PACKS.includes(
      currentValue
    )
  ) {

);
    selector.value =
      currentValue;

if (
PACKS.includes(
currentValue
)
) {
  }

selector.value =
  currentValue;
  else {

}
    selector.value =
      "Pack 1";
  }

else {
  /*
     IMPORTANT:

selector.value =
  "Pack 1";
     Selector changes ONLY
     the Cell Voltage Heat Map.
  */

  selector.onchange =
    onFilterChange;
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
   INITIALIZATION
═══════════════════════════════════════════ */

async function initDashboard() {

/*
Setup Pack 1–8 selector.
*/
  /*
     Setup Pack 1–8 selector.
  */

ensurePackSelectorOptions();
  ensurePackSelectorOptions();

/*
Get overall BMS data.
*/
  /*
     Get overall BMS data.
  */

await getBMSData();
  await getBMSData();

/*
Get cell data from all
eight Supabase tables.
*/
  /*
     Get cell data from all
     eight Supabase tables.
  */

await getAllPackData();
  await getAllPackData();

/*
Build remaining sections.
*/
  /*
     Build remaining sections.
  */

buildHeatmap();
  buildHeatmap();

buildAlerts();
  buildAlerts();

buildReports();
  buildReports();
}


/* ═══════════════════════════════════════════
LIVE UPDATE
   LIVE UPDATE
═══════════════════════════════════════════ */

function startLiveUpdates() {

if (refreshTimer) {
  if (refreshTimer) {

clearInterval(
  refreshTimer
);

}
    clearInterval(
      refreshTimer
    );
  }

refreshTimer =
setInterval(
async () => {
  refreshTimer =
    setInterval(
      async () => {

    await getBMSData();
        await getBMSData();

    await getAllPackData();
        await getAllPackData();

    /*
       No page flashing.
        /*
           No page flashing.

       Existing dashboard UI
       remains visible.
           Existing dashboard UI
           remains visible.

       Bar chart stays All 8 Packs.
           Bar chart stays All 8 Packs.

       Heat map stays on whichever
       Pack is currently selected.
    */

  },
  5000
);
           Heat map stays on whichever
           Pack is currently selected.
        */

      },
      5000
    );
}


/* ═══════════════════════════════════════════
ENTER KEY LOGIN
   ENTER KEY LOGIN
═══════════════════════════════════════════ */

document.addEventListener(
"keydown",
e => {
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
      login();
    }

}
  }
);


/* ═══════════════════════════════════════════
START LIVE UPDATES AFTER DASHBOARD LOAD
   START LIVE UPDATES AFTER DASHBOARD LOAD
═══════════════════════════════════════════ */

const originalInitDashboard =
initDashboard;
  initDashboard;

initDashboard =
async function () {
  async function () {

await originalInitDashboard();
    await originalInitDashboard();

startLiveUpdates();

};
    startLiveUpdates();
  };
