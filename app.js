let rawData = [];
let chart = null;

const statusBox = document.getElementById("status");

function status(msg) {
  console.log(msg);
  if (statusBox) statusBox.innerText = msg;
}

function getColor(i) {
  const colors = [
    "#ff4d4d",
    "#4d79ff",
    "#4dff88",
    "#ffb84d",
    "#b84dff",
    "#4dfff6",
    "#ff4df0",
    "#ffd24d"
  ];
  return colors[i % colors.length];
}

async function loadData() {
  try {
    status("Loading data...");

    const res = await fetch("data/members.json");

    if (!res.ok) {
      status("❌ Cannot load data/members.json (404)");
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      status("❌ Invalid JSON format");
      return [];
    }

    return data;
  } catch (err) {
    console.error(err);
    status("❌ Failed to fetch JSON");
    return [];
  }
}

function filterData(data, start, end) {
  return data.filter(d => {
    return (!start || d.date >= start) &&
           (!end || d.date <= end);
  });
}

function render(data) {
  const canvas = document.getElementById("chart");

  if (chart) chart.destroy();

  if (!data || !data.length) {
    status("⚠️ No data to display");
    return;
  }

  const labels = data.map(d => d.date);

  const groups = {};

  // build groups safely
  for (const entry of data) {
    if (!entry?.groups) continue;

    for (const [id, g] of Object.entries(entry.groups)) {
      if (!groups[id]) {
        groups[id] = {
          name: g?.name || id,
          data: []
        };
      }
    }
  }

  // map values
  for (const id in groups) {
    groups[id].data = data.map(d =>
      d?.groups?.[id]?.memberCount ?? null
    );
  }

  // ✨ CLEAN MODERN CHART
  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: Object.values(groups).map((g, i) => ({
        label: g.name,
        data: g.data,

        // 🔥 visual upgrade
        borderColor: getColor(i),
        backgroundColor: getColor(i) + "22",
        borderWidth: 3,
        pointRadius: 2,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true
      }))
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        legend: {
          labels: {
            color: "#fff",
            boxWidth: 12,
            padding: 15
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: "#111",
          titleColor: "#fff",
          bodyColor: "#ddd",
          borderColor: "#333",
          borderWidth: 1
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#aaa",
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: "#1f1f1f"
          }
        },
        y: {
          ticks: {
            color: "#aaa"
          },
          grid: {
            color: "#1f1f1f"
          }
        }
      }
    }
  });

  status("✅ Chart loaded");
}

window.addEventListener("DOMContentLoaded", init);