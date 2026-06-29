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

  if (!canvas) {
    status("❌ Canvas not found");
    return;
  }

  if (chart) chart.destroy();

  if (!data || !data.length) {
    status("⚠️ No data to display");
    return;
  }

  const labels = data.map(d => d.date);

  const groups = {};

  // SAFE GROUP PARSING
  for (const entry of data) {
    if (!entry?.groups) continue;

    for (const [id, g] of Object.entries(entry.groups || {})) {
      if (!groups[id]) {
        groups[id] = {
          name: g?.name || id,
          data: []
        };
      }
    }
  }

  // BUILD SERIES
  for (const id in groups) {
    groups[id].data = data.map(d =>
      d?.groups?.[id]?.memberCount ?? null
    );
  }

  // CREATE CHART
  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: Object.values(groups).map((g, i) => ({
        label: g.name,
        data: g.data,
        borderColor: getColor(i),
        backgroundColor: getColor(i) + "33",
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#fff"
          }
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

  status("✅ Loaded successfully");
}

function applyFilter() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const filtered = filterData(rawData, start, end);
  render(filtered);
}

async function init() {
  rawData = await loadData();

  console.log("RAW DATA:", rawData);

  render(rawData);
}

window.addEventListener("DOMContentLoaded", init);