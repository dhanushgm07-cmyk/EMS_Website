function buildBarChart() {

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

    const oldLabels = barChart.data.labels || [];

    const labelsChanged =
      oldLabels.length !== labels.length ||
      oldLabels.some(
        (label, index) => label !== labels[index]
      );

    /*
       If user changes between:
       All Packs ↔ individual Pack

       recreate chart because number of bars changes.
    */

    if (labelsChanged) {

      barChart.destroy();
      barChart = null;

    }
  }


  /* =================================================
     CREATE CHART FIRST TIME
     ================================================= */

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
                voltageColors[PACKS.indexOf(pack)]
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

        aspectRatio: 1.8,


        /* =================================================
           THIS IS THE MOVING ANIMATION
           ================================================= */

        animation: {

          duration: 1200,

          easing: "easeInOutQuart"

        },

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


          /* LEFT SIDE — VOLTAGE */

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


          /* RIGHT SIDE — SOC */

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


  /* =================================================
     UPDATE EXISTING CHART
     ================================================= */

  barChart.data.labels = labels;

  barChart.data.datasets[0].data = voltage;

  barChart.data.datasets[1].data = soc;


  barChart.data.datasets[0].backgroundColor =
    packsToShow.map(pack =>
      voltageColors[PACKS.indexOf(pack)]
    );


  /* Update title */

  if (barChart.options.plugins?.title) {

    barChart.options.plugins.title.text =
      selected === "All Packs"
        ? "Battery Voltage & Estimated SOC — All Packs"
        : `Battery Voltage & Estimated SOC — ${selected}`;

  }


  /* =================================================
     THIS MAKES THE BARS MOVE TO THE NEW VALUES
     ================================================= */

  barChart.update();

}
