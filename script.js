/* ═══════════════════════════════════════════
   BAR CHART — VOLTAGE & SOC
   SMOOTH 5-SECOND LIVE ANIMATION
═══════════════════════════════════════════ */

function buildBarChart() {

  const ctx =
    document.getElementById("barChart");

  if (!ctx) return;


  const selected = getSelectedPack();


  /*
     All Packs = show all available packs
     Individual Pack = show only selected pack
  */
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


  /*
     ─────────────────────────────────────────
     IMPORTANT

     If chart already exists, DO NOT destroy it.

     Update the existing datasets instead.

     This allows Chart.js to smoothly animate
     the bars from the old value to the new
     value every 5 seconds.
     ─────────────────────────────────────────
  */

  if (barChart) {

    /*
       If pack selection changed, the number of
       bars may have changed.

       In that case recreate the chart.
    */
    const oldLabels =
      barChart.data.labels || [];

    const labelsChanged =
      oldLabels.length !== labels.length ||
      oldLabels.some(
        (label, index) =>
          label !== labels[index]
      );


    if (labelsChanged) {

      barChart.destroy();
      barChart = null;

    }

  }


  /*
     ─────────────────────────────────────────
     CREATE CHART
     ─────────────────────────────────────────
  */

  if (!barChart) {

    barChart = new Chart(ctx, {

      type: "bar",

      data: {

        labels: labels,

        datasets: [

          {
            label: "Voltage (V)",

            data: voltage,

            backgroundColor:
              packsToShow.map(pack =>
                voltageColors[
                  PACKS.indexOf(pack)
                ]
              ),

            borderRadius: 6,

            yAxisID: "y"
          },


          {
            label: "SOC (%)",

            data: soc,

            backgroundColor:
              "rgba(167,184,156,0.5)",

            borderRadius: 6,

            yAxisID: "y1"
          }

        ]

      },


      options: {

        ...CHART_DEFAULTS,


        /*
           Slightly larger chart
        */
        aspectRatio: 1.8,


        /*
           ─────────────────────────────
           SMOOTH BAR MOVEMENT
           ─────────────────────────────
        */

        animation: {

          duration: 1200,

          easing: "easeInOutQuart"

        },


        /*
           Animate dataset changes
        */

        animations: {

          y: {

            duration: 1200,

            easing: "easeInOutQuart"

          }

        },


        plugins: {

          ...CHART_DEFAULTS.plugins,

          title: {

            display: true,

            text:
              selected === "All Packs"
                ? "Battery Voltage & Estimated SOC — All Packs"
                : `Battery Voltage & Estimated SOC — ${selected}`,

            font: {

              family: "Inter",

              size: 13,

              weight: "600"

            },

            color: "#4A4A4A"

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


          /*
             ─────────────────────────
             VOLTAGE AXIS
             ─────────────────────────

             Fixed 0–60 V so the axis
             does not zoom into values
             like 49.83–49.86 V.
          */

          y: {

            position: "left",

            min: 0,

            max: 60,

            beginAtZero: true,

            grid: {

              color: "#E0E0E0"

            },

            ticks: {

              stepSize: 10,

              font: {

                family: "Inter",

                size: 11

              },

              color: "#6B6B6B",

              callback: function(value) {

                return value + " V";

              }

            }

          },


          /*
             ─────────────────────────
             SOC AXIS
             ─────────────────────────
          */

          y1: {

            position: "right",

            min: 0,

            max: 100,

            beginAtZero: true,

            grid: {

              display: false

            },

            ticks: {

              stepSize: 20,

              font: {

                family: "Inter",

                size: 11

              },

              color: "#6B6B6B",

              callback: function(value) {

                return value + " %";

              }

            }

          }

        }

      }

    });


    return;

  }


  /*
     ─────────────────────────────────────────
     UPDATE EXISTING CHART
     ─────────────────────────────────────────

     THIS is what produces the moving effect.
  */

  barChart.data.labels = labels;


  /*
     Update Voltage
  */

  barChart.data.datasets[0].data =
    voltage;


  /*
     Update SOC
  */

  barChart.data.datasets[1].data =
    soc;


  /*
     Update voltage colours if pack selection
     changed without changing chart length.
  */

  barChart.data.datasets[0].backgroundColor =
    packsToShow.map(pack =>
      voltageColors[
        PACKS.indexOf(pack)
      ]
    );


  /*
     Update title
  */

  if (
    barChart.options.plugins &&
    barChart.options.plugins.title
  ) {

    barChart.options.plugins.title.text =
      selected === "All Packs"
        ? "Battery Voltage & Estimated SOC — All Packs"
        : `Battery Voltage & Estimated SOC — ${selected}`;

  }


  /*
     Animate from old values → new values
  */

  barChart.update();

}
