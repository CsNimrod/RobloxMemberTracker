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
    status("Loading data...");

    const res = await fetch("data/members.json");

    if (!res.ok) {
      status("❌ Failed to load JSON");
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      status("❌ JSON is not an array");
      return [];
    }

    return data;
  } catch (err) {
    console.error(err);
    status("❌ Fetch error");
    return [];
  }
}

function render(data) {
  const canvas = document.getElementById("chart");

  if (!canvas) {
    status("❌ Canvas not found");
    return;
  }

  if (chart) chart.destroy();

  if (!data || data.length === 0) {
    status("⚠️ No data to display");
    return;
  }

  // 📅 dates
  const labels = data.map(d => d.date);

  // 📦 build groups safely
  const groupMap = {};

  for (const entry of data) {
    const groups = entry?.groups;

    if (!groups) continue;

    for (const [id, g] of Object.entries(groups)) {
      if (!groupMap[id]) {
        groupMap[id] = {
          name: g?.name || `Group ${id}`,
          data: []
        };
      }
    }
  }

  // 📊 fill values
  for (const id in groupMap) {
    groupMap[id].data = data.map(d =>
      d?.groups?.[id]?.memberCount ?? null
    );
  }

  const groupIds = Object.keys(groupMap);

  if (groupIds.length === 0) {
    status("❌ No groups found in data");
    return;
  }

  // 🔥 DEBUG (safe to keep)
  console.log("Labels:", labels);
  console.log("Groups:", groupMap);

  // 📈 CREATE CHART
  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: groupIds.map((id, i) => ({
        label: groupMap[id].name,
        data: groupMap[id].data,

        borderColor: getColor(i),
        backgroundColor: getColor(i) + "22",
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.35,
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
            color: "#fff"
          }
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

  status("✅ Chart loaded successfully");
}

async function init() {
  rawData = await loadData();
  console.log("RAW DATA:", rawData);
  render(rawData);
}

window.addEventListener("DOMContentLoaded", init);