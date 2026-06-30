let rawData = [];
let chart = null;

const statusBox = document.getElementById("status");

function status(msg) {
  console.log(msg);
  if (statusBox) statusBox.innerText = msg;
}

function getColor(i) {
  const colors = [
    "#ff4d4d", "#4d79ff", "#4dff88", "#ffb84d",
    "#b84dff", "#4dfff6", "#ff4df0", "#ffd24d"
  ];
  return colors[i % colors.length];
}

async function loadData() {
  try {
    const res = await fetch("data/members.json");

    if (!res.ok) {
      status("❌ JSON not found (check /data/members.json)");
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      status("❌ JSON must be an array");
      return [];
    }

    return data;
  } catch (err) {
    console.error(err);
    status("❌ Failed to load JSON");
    return [];
  }
}

function render(data) {
  const canvas = document.getElementById("chart");

  if (!window.Chart) {
    status("❌ Chart.js not loaded");
    return;
  }

  if (!canvas) {
    status("❌ Canvas missing");
    return;
  }

  if (chart) chart.destroy();

  if (!data || data.length === 0) {
    status("⚠️ No data");
    return;
  }

  // FIX: robust group detection
  const labels = data.map(d => d.date);

  const groupMap = {};

  for (const entry of data) {
    const groups = entry?.groups;

    if (!groups || typeof groups !== "object") continue;

    for (const [id, g] of Object.entries(groups)) {
      if (!groupMap[id]) {
        groupMap[id] = {
          name: g?.name || id,
          data: []
        };
      }
    }
  }

  // FIX: fill values safely
  for (const id in groupMap) {
    groupMap[id].data = data.map(d =>
      d?.groups?.[id]?.memberCount ?? null
    );
  }

  const datasets = Object.values(groupMap).map((g, i) => ({
    label: g.name,
    data: g.data,
    borderColor: getColor(i),
    backgroundColor: getColor(i) + "22",
    borderWidth: 3,
    pointRadius: 2,
    pointHoverRadius: 6,
    tension: 0.35,
    fill: true
  }));

  try {
    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets
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
            labels: { color: "#fff" }
          },
          tooltip: {
            backgroundColor: "#111",
            borderColor: "#333",
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: "#aaa" },
            grid: { color: "#222" }
          },
          y: {
            ticks: { color: "#aaa" },
            grid: { color: "#222" }
          }
        }
      }
    });

    status("✅ Chart loaded");
  } catch (err) {
    console.error(err);
    status("❌ Chart failed to render");
  }
}

async function init() {
  status("Loading...");

  rawData = await loadData();

  console.log("RAW DATA:", rawData);

  render(rawData);
}

window.addEventListener("DOMContentLoaded", init);