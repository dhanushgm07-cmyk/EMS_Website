/* =========================================================
   EMS ENERGY DASHBOARD
   8 PACK REAL SUPABASE VERSION
   ========================================================= */

const supabaseUrl = "https://xfozfhopqxokmdcgyhqy.supabase.co";

const supabaseKey =
  "sb_publishable_yx3wAYXNdfYo8HwrmDUryQ_idY6gR7z";

const db = supabase.createClient(
  supabaseUrl,
  supabaseKey
);


/* =========================================================
   PACK CONFIGURATION
   ========================================================= */

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


/* =========================================================
   GLOBAL DATA
   ========================================================= */

let BMS_DATA = [];
let PACK_DATA = {};

let lineChart = null;
let barChart = null;
let trendChart = null;

let currentRange = "daily";
let selectedLocation = "";

let refreshTimer = null;
let toastTimer = null;


/* =========================================================
   CHART DEFAULTS
   ========================================================= */

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: true,

  plugins: {
    legend: {
      labels: {
        font: {
          family: "Inter",
          size: 11
        },

        color: "#6B6B6B",
        boxWidth: 12
      }
    }
  },

  scales: {
    x: {
      grid: {
        color: "#E0E0E0"
      },

      ticks: {
        font: {
          family: "Inter",
          size: 11
        },

        color: "#6B6B6B"
      }
    },

    y: {
      grid: {
        color: "#E0E0E0"
      },

      ticks: {
        font: {
          family: "Inter",
          size: 11
        },

        color: "#6B6B6B"
      }
    }
  }
};


/* =========================================================
   SAFE VALUE SETTER
   ========================================================= */

function setValue(id, value) {

  const el = document.getElementById(id);

  if (!el) return;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    el.textContent = "--";
    return;
  }

  const number = Number(value);

  if (Number.isFinite(number)) {
    el.textContent = number.toFixed(1);
  } else {
    el.textContent = value;
  }
}


/* =========================================================
   OPTIONAL PACK VALUE SETTER
   ========================================================= */

function setOptionalPackValue(ids, value) {

  for (const id of ids) {

    const el = document.getElementById(id);

    if (!el) continue;

    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      el.textContent = "--";
    } else {
      el.textContent = Number(value).toFixed(1);
    }

    return;
  }
}


/* =========================================================
   SODIUM-ION SOC ESTIMATION
   =========================================================
   
   This is an ESTIMATED SOC based on voltage.
   It is not the RBMS internal SOC.
   ========================================================= */

function calculateEstimatedSOCFromCellVoltage(cellVoltage) {

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

  const v = Number(cellVoltage);

  if (!Number.isFinite(v)) {
    return 0;
  }

  if (v <= 1.50) {
    return 0;
  }

  if (v >= 3.45) {
    return 100;
  }

  for (let i = 1; i < points.length; i++) {

    const [v1, s1] = points[i - 1];

    const [v2, s2] = points[i];

    if (v <= v2) {

      const ratio =
        (v - v1) /
        (v2 - v1);

      return Math.round(
        s1 +
        ratio * (s2 - s1)
      );
    }
  }

  return 0;
}


/* =========================================================
   PACK SOC
   ========================================================= */

function calculatePackSOC(cells) {

  const validCells = cells

    .map(Number)

    .filter(v =>
      Number.isFinite(v) &&
      v > 0
    );

  if (!validCells.length) {
    return 0;
  }

  const averageCellVoltage =
    validCells.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    validCells.length;

  return calculateEstimatedSOCFromCellVoltage(
    averageCellVoltage
  );
}


/* =========================================================
   CELL STATUS
   ========================================================= */

function getCellStatus(voltage) {

  const v = Number(voltage);

  if (!Number.isFinite(v)) {
    return "alert";
  }

  /*
    Sodium-ion limits

    Alert:
    < 1.5V
    > 3.5V

    Caution:
    1.5V - 1.7V
    3.4V - 3.5V

    Balanced:
    1.7V - 3.4V
  */

  if (
    v < 1.5 ||
    v > 3.5
  ) {
    return "alert";
  }

  if (
    v < 1.7 ||
    v > 3.4
  ) {
    return "caution";
  }

  return "balanced";
}


/* =========================================================
   CELL STATUS COLOR
   ========================================================= */

function getCellColor(status) {

  if (status === "alert") {
    return "#D75B5B";
  }

  if (status === "caution") {
    return "#E0A25B";
  }

  return "#A7B89C";
}


/* =========================================================
   GET OVERALL BMS DATA
   ========================================================= */

async function getBMSData() {

  const { data, error } = await db

    .from("BMS_Data")

    .select("*")

    .order(
      "created_at",
      {
        ascending: false
      }
    )

    .limit(50);


  if (error) {

    console.error(
      "BMS DATA ERROR:",
      error
    );

    return;
  }


  if (
    !data ||
    data.length === 0
  ) {

    console.warn(
      "No BMS data available"
    );

    return;
  }


  BMS_DATA = data;


  /*
    KPI VALUES ARE OVERALL
    SYSTEM VALUES.

    Pack selector does NOT
    affect these six cards.
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


/* =========================================================
   GET ONE PACK
   ========================================================= */

async function getOnePackData(packName) {

  const table =
    PACK_TABLES[packName];

  if (!table) {

    console.error(
      "No table configured for",
      packName
    );

    return null;
  }


  try {

    const result =
      await db

        .from(table)

        .select("*")

        .order(
          "created_at",
          {
            ascending: false
          }
        )

        .limit(1);


    const data =
      result.data;

    const error =
      result.error;


    if (error) {

      console.error(
        `${packName} READ ERROR:`,
        error
      );

      return null;
    }


    if (
      !data ||
      data.length === 0
    ) {

      console.warn(
        `${packName}: No rows found`
      );

      return null;
    }


    const row =
      data[0];


    const cells = [];


    /*
      Always create exactly
      16 cell positions.
    */

    for (
      let i = 1;
      i <= 16;
      i++
    ) {

      const raw =
        row[`Cell_${i}`];

      const value =
        Number.parseFloat(raw);


      if (
        Number.isFinite(value)
      ) {

        cells.push(value);

      } else {

        cells.push(0);
      }
    }


    const validCells =
      cells.filter(
        value =>
          Number.isFinite(value) &&
          value > 0
      );


    /*
      Pack voltage =
      sum of all valid cells.
    */

    const packVoltage =
      validCells.reduce(
        (sum, value) =>
          sum + value,
        0
      );


    /*
      Average cell voltage.
    */

    const averageCellVoltage =
      validCells.length
        ? validCells.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          validCells.length
        : 0;


    /*
      Estimated SOC.
    */

    const estimatedSOC =
      calculatePackSOC(
        cells
      );


    return {

      name: packName,

      cells: cells,

      voltage: packVoltage,

      averageCellVoltage:
        averageCellVoltage,

      soc: estimatedSOC,

      created_at:
        row.created_at,

      available: true
    };


  } catch (error) {

    console.error(
      `${packName} EXCEPTION:`,
      error
    );

    return null;
  }
}


/* =========================================================
   GET ALL 8 PACKS
   ========================================================= */

async function getAllPackData() {

  /*
    Create a completely new object every time.

    This prevents old/stale pack data
    from remaining in memory.
  */

  const newPackData = {};


  const results =
    await Promise.all(

      PACKS.map(
        async packName => {

          const result =
            await getOnePackData(
              packName
            );

          return {
            packName,
            result
          };
        }
      )
    );


  for (const item of results) {

    if (item.result) {

      newPackData[
        item.packName
      ] = item.result;
    }
  }


  PACK_DATA =
    newPackData;


  console.log(
    "PACK DATA LOADED:",
    Object.keys(PACK_DATA)
  );


  updateSelectedPackDisplay();

  buildBarChart();

  buildHeatmap();
}


/* =========================================================
   KPI STATUS
   ========================================================= */

function updateKPIStatus(current) {

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


  const value =
    Number(current);


  if (value > 0) {

    currTrend.textContent =
      "Charging";

    currTrend.className =
      "kpi-trend up";


    powTrend.textContent =
      "Charging";

    powTrend.className =
      "kpi-trend up";


  } else if (value < 0) {

    currTrend.textContent =
      "Discharging";

    currTrend.className =
      "kpi-trend down";


    powTrend.textContent =
      "Discharging";

    powTrend.className =
      "kpi-trend down";


  } else {

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


/* =========================================================
   GET SELECTED PACK
   ========================================================= */

function getSelectedPack() {

  const selector =
    document.getElementById(
      "sel-pack"
    );


  if (!selector) {
    return "All Packs";
  }


  return (
    selector.value ||
    "All Packs"
  );
}


/* =========================================================
   GET PACKS TO DISPLAY
   ========================================================= */

function getPacksToDisplay() {

  const selected =
    getSelectedPack();


  if (
    selected === "All Packs"
  ) {

    /*
      IMPORTANT:

      Always return ALL 8 packs.

      Do NOT filter them using
      PACK_DATA here.

      If one pack has no data,
      the heatmap/chart will show
      "--" instead of completely
      removing that pack.
    */

    return [...PACKS];
  }


  if (
    PACKS.includes(selected)
  ) {

    return [selected];
  }


  return [];
}


/* =========================================================
   SELECTED PACK DISPLAY
   ========================================================= */

function updateSelectedPackDisplay() {

  const selected =
    getSelectedPack();


  /*
    ALL PACKS
  */

  if (
    selected === "All Packs"
  ) {

    const available =
      PACKS

        .map(
          pack =>
            PACK_DATA[pack]
        )

        .filter(Boolean);


    if (
      available.length === 0
    ) {

      setOptionalPackValue(
        [
          "selected-pack-voltage",
          "pack-voltage"
        ],
        null
      );

      setOptionalPackValue(
        [
          "selected-pack-soc",
          "pack-soc"
        ],
        null
      );

      return;
    }


    /*
      Total voltage =
      sum of all pack voltages.
    */

    const totalVoltage =
      available.reduce(
        (sum, pack) =>
          sum +
          Number(
            pack.voltage || 0
          ),
        0
      );


    /*
      Overall estimated SOC =
      average SOC of available packs.
    */

    const averageSOC =
      available.reduce(
        (sum, pack) =>
          sum +
          Number(
            pack.soc || 0
          ),
        0
      ) /
      available.length;


    setOptionalPackValue(
      [
        "selected-pack-voltage",
        "pack-voltage"
      ],
      totalVoltage
    );


    setOptionalPackValue(
      [
        "selected-pack-soc",
        "pack-soc"
      ],
      averageSOC
    );


    return;
  }


  /*
    INDIVIDUAL PACK
  */

  const pack =
    PACK_DATA[selected];


  if (!pack) {

    setOptionalPackValue(
      [
        "selected-pack-voltage",
        "pack-voltage"
      ],
      null
    );

    setOptionalPackValue(
      [
        "selected-pack-soc",
        "pack-soc"
      ],
      null
    );

    return;
  }


  setOptionalPackValue(
    [
      "selected-pack-voltage",
      "pack-voltage"
    ],
    pack.voltage
  );


  setOptionalPackValue(
    [
      "selected-pack-soc",
      "pack-soc"
    ],
    pack.soc
  );
}


/* =========================================================
   FILTER CHANGE
   ========================================================= */

function onFilterChange() {

  updateSelectedPackDisplay();

  buildLineChart();

  buildBarChart();

  buildHeatmap();
}


/* =========================================================
   LINE CHART
   ========================================================= */

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


  if (
    !BMS_DATA.length
  ) {
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
              hour: "2-digit",
              minute: "2-digit"
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


/* =========================================================
   VOLTAGE + SOC BAR CHART
   ========================================================= */

function buildBarChart() {

  const ctx =
    document.getElementById(
      "barChart"
    );


  if (!ctx) {
    return;
  }


  if (barChart) {

    barChart.destroy();

    barChart = null;
  }


  const selected =
    getSelectedPack();


  const packsToShow =
    getPacksToDisplay();


  if (
    !packsToShow.length
  ) {
    return;
  }


  const labels =
    packsToShow;


  /*
    IMPORTANT:

    Do NOT filter the packs
    based on PACK_DATA.

    This guarantees Pack 1-8
    remain visible.
  */

  const voltage =
    packsToShow.map(
      pack => {

        const data =
          PACK_DATA[pack];

        if (!data) {
          return null;
        }

        return Number(
          data.voltage || 0
        );
      }
    );


  const soc =
    packsToShow.map(
      pack => {

        const data =
          PACK_DATA[pack];

        if (!data) {
          return null;
        }

        return Number(
          data.soc || 0
        );
      }
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


  barChart =
    new Chart(
      ctx,
      {

        type: "bar",

        data: {

          labels: labels,

          datasets: [

            {

              label:
                "Voltage (V)",

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


          plugins: {

            ...CHART_DEFAULTS.plugins,

            title: {

              display: true,

              text:
                selected ===
                "All Packs"

                  ? "Battery Voltage & Estimated SOC — All Packs"

                  : `Battery Voltage & Estimated SOC — ${selected}`,

              font: {

                family:
                  "Inter",

                size: 13,

                weight:
                  "600"
              },

              color:
                "#4A4A4A"
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
              },

              position:
                "left",

              beginAtZero:
                false
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
                  "#6B6B6B"
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


/* =========================================================
   HEATMAP
   ========================================================= */

function buildHeatmap() {

  const grid =
    document.getElementById(
      "hm-grid"
    );


  if (!grid) {
    return;
  }


  /*
    Completely rebuild only
    the heatmap contents.

    No page refresh.
    No animation.
    No collapse.
  */

  grid.innerHTML = "";


  const selected =
    getSelectedPack();


  const packsToShow =
    getPacksToDisplay();


  if (
    !packsToShow.length
  ) {

    grid.innerHTML =
      `
        <div
          style="
            padding:20px;
            color:#777;
          "
        >
          No pack selected.
        </div>
      `;

    return;
  }


  /*
    ALL PACKS:

    Every pack gets its own
    heading + 16 cells.

    INDIVIDUAL PACK:

    Only one heading + 16 cells.
  */

  packsToShow.forEach(
    (packName, packIndex) => {

      const pack =
        PACK_DATA[packName];


      /*
        PACK HEADING
      */

      const heading =
        document.createElement(
          "div"
        );


      heading.className =
        "hm-pack-heading";


      /*
        Keep each pack as a
        separate visual section.

        For All Packs, the
        heading spans the grid.
      */

      heading.style.gridColumn =
        "1 / -1";


      heading.style.fontWeight =
        "600";


      heading.style.margin =
        packIndex === 0
          ? "0 0 8px"
          : "24px 0 8px";


      if (pack) {

        heading.textContent =
          `${packName} — ${pack.voltage.toFixed(2)} V | SOC ${pack.soc}%`;

      } else {

        heading.textContent =
          `${packName} — No Data`;
      }


      grid.appendChild(
        heading
      );


      /*
        CELL DATA
      */

      for (
        let i = 0;
        i < 16;
        i++
      ) {

        const el =
          document.createElement(
            "div"
          );


        el.className =
          "hm-zone";


        let voltage = 0;


        if (
          pack &&
          Array.isArray(
            pack.cells
          )
        ) {

          voltage =
            Number(
              pack.cells[i] || 0
            );
        }


        /*
          No data
        */

        if (
          !pack ||
          !Number.isFinite(
            voltage
          ) ||
          voltage <= 0
        ) {

          el.style.background =
            "#D8D8D8";


          el.innerHTML =
            `

              <div class="z-name">
                Cell ${i + 1}
              </div>

              <div class="z-kwh">
                --
              </div>

              <div class="z-tip">

                <strong>
                  ${packName} — Cell ${i + 1}
                </strong>

                <br>

                Voltage:
                <strong>
                  No Data
                </strong>

              </div>

            `;


          grid.appendChild(
            el
          );

          continue;
        }


        /*
          CELL STATUS
        */

        const status =
          getCellStatus(
            voltage
          );


        const bg =
          getCellColor(
            status
          );


        el.style.background =
          bg;


        /*
          CELL DISPLAY
        */

        el.innerHTML =
          `

            <div class="z-name">
              Cell ${i + 1}
            </div>

            <div class="z-kwh">
              ${voltage.toFixed(3)}V
            </div>

            <div class="z-tip">

              <strong>
                ${packName} — Cell ${i + 1}
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


        grid.appendChild(
          el
        );
      }


      /*
        Spacer between packs.

        This keeps the original
        multi-pack layout clean
        instead of collapsing.
      */

      if (
        selected === "All Packs" &&
        packIndex <
          packsToShow.length - 1
      ) {

        const spacer =
          document.createElement(
            "div"
          );


        spacer.style.gridColumn =
          "1 / -1";


        spacer.style.height =
          "4px";


        grid.appendChild(
          spacer
        );
      }

    }
  );


  /*
    UPDATE HEATMAP TITLE
  */

  const title =
    document.querySelector(
      "#tab-heatmap .card-title"
    );


  if (title) {

    title.textContent =
      selected ===
      "All Packs"

        ? "Cell Voltage Heat Map — All Packs"

        : `Cell Voltage Heat Map — ${selected}`;
  }
}


/* =========================================================
   TRENDS
   ========================================================= */

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


/* =========================================================
   TREND CHART
   ========================================================= */

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


  if (
    !BMS_DATA.length
  ) {
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
            hour: "2-digit",
            minute: "2-digit"
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

        type: "line",

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

              tension: 0.35,

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

              tension: 0.35,

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

              min:
                0,

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


/* =========================================================
   ALERTS
   ========================================================= */

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


/* =========================================================
   FORMAT ALERT TIME
   ========================================================= */

function fmtTime(
  mins
) {

  if (
    mins < 60
  ) {

    return `${mins}m ago`;
  }


  return `${Math.floor(mins / 60)}h ago`;
}


/* =========================================================
   BUILD ALERTS
   ========================================================= */

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
    ALERTS
      .map(
        a => `

          <div class="acc-item">

            <button
              class="acc-trigger"
              onclick="toggleAcc('${a.id}')"
            >

              <span
                class="acc-sev-icon"
              >
                ${SEV_ICON[a.sev]}
              </span>


              <div class="acc-meta">

                <div
                  class="acc-meta-row"
                >

                  <span
                    class="acc-title"
                  >
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


/* =========================================================
   REPORTS
   ========================================================= */

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


/* =========================================================
   BUILD REPORTS
   ========================================================= */

function buildReports() {

  const list =
    document.getElementById(
      "reports-list"
    );


  if (!list) {
    return;
  }


  list.innerHTML =
    REPORTS

      .map(
        r => `

          <div class="acc-item">

            <button
              class="acc-trigger"
              onclick="toggleAcc('${r.id}')"
            >

              <span
                class="acc-sev-icon"
              >
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

                <div
                  class="acc-recs-title"
                >
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

                <div
                  class="acc-recs-title"
                >
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
      )
      .join("");
}


/* =========================================================
   ACCORDION
   ========================================================= */

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


/* =========================================================
   LOCATION
   ========================================================= */

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


/* =========================================================
   TOAST
   ========================================================= */

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


/* =========================================================
   TABS
   ========================================================= */

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


/* =========================================================
   AUTH
   ========================================================= */

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
      ?.value
      .trim();


  const password =
    document
      .getElementById(
        "password"
      )?.value;


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


    const loginPage =
      document.getElementById(
        "login-page"
      );


    const dashboardPage =
      document.getElementById(
        "dashboard-page"
      );


    if (loginPage) {

      loginPage.classList.remove(
        "active"
      );
    }


    if (dashboardPage) {

      dashboardPage.classList.add(
        "active"
      );
    }


    initDashboard();


  } else {

    if (err) {

      err.classList.remove(
        "hidden"
      );
    }
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

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


/* =========================================================
   CLOCK
   ========================================================= */

setInterval(
  () => {

    const n =
      new Date();


    const pad =
      value =>
        String(value)
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


/* =========================================================
   DESTROY CHARTS
   ========================================================= */

function destroyCharts() {

  if (lineChart) {

    lineChart.destroy();

    lineChart = null;
  }


  if (barChart) {

    barChart.destroy();

    barChart = null;
  }


  if (trendChart) {

    trendChart.destroy();

    trendChart = null;
  }
}


/* =========================================================
   ENSURE PACK SELECTOR
   ========================================================= */

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


  selector.innerHTML =
    "";


  /*
    ALL PACKS
  */

  const allOption =
    document.createElement(
      "option"
    );


  allOption.value =
    "All Packs";


  allOption.textContent =
    "All Packs";


  selector.appendChild(
    allOption
  );


  /*
    PACK 1-8
  */

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


  /*
    Restore previous
    selection if valid.
  */

  if (
    [
      "All Packs",
      ...PACKS
    ].includes(
      currentValue
    )
  ) {

    selector.value =
      currentValue;

  } else {

    selector.value =
      "All Packs";
  }


  selector.onchange =
    onFilterChange;
}


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

async function initDashboard() {

  ensurePackSelectorOptions();


  /*
    Reset pack data when
    dashboard starts.
  */

  PACK_DATA = {};


  await getBMSData();


  await getAllPackData();


  buildHeatmap();

  buildAlerts();

  buildReports();
}


/* =========================================================
   LIVE UPDATE
   ========================================================= */

function startLiveUpdates() {

  if (refreshTimer) {

    clearInterval(
      refreshTimer
    );
  }


  /*
    Update every 5 seconds.

    This does NOT reload the page.
    It only refreshes database data.
  */

  refreshTimer =
    setInterval(
      async () => {

        await getBMSData();

        await getAllPackData();

      },
      5000
    );
}


/* =========================================================
   LOGIN ENTER KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter" &&

      document
        .getElementById(
          "login-page"
        )
        ?.classList
        .contains(
          "active"
        )
    ) {

      login();
    }

  }
);


/* =========================================================
   START LIVE UPDATES AFTER LOGIN
   ========================================================= */

const originalInitDashboard =
  initDashboard;


initDashboard =
  async function () {

    await originalInitDashboard();

    startLiveUpdates();
  };
