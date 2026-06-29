let rawData = [];
let chart = null;

const statusBox = document.getElementById("status");

function showStatus(msg) {
  statusBox.innerText = msg;
}

function getColor(index) {
  const colors = [
    "red", "blue", "green", "orange", "purple",
    "cyan", "magenta", "gold", "teal", "pink"
  ];
  return colors[index % colors.length];
}

async function loadData() {
  try {
    const res = await fetch("data/members.json");
    if (!res.ok) throw new Error("Failed to load JSON");
    return await res.json();
  } catch (err) {
    console.error(err);
    showStatus("❌ Failed to load data (check GitHub Pages setup)");
    return [];
  }
}

function filterData(data, start, end) {
  return data.filter(entry => {
    const d = entry.date;
    return (!start || d >= start) && (!end || d <= end);
  });
}

function renderChart(data) {
  if (chart) chart.destroy();

  if (!data.length) {
    showStatus("⚠️ No data in selected range");
    return;
  }

  const labels = data.map(d => d.date);

  const groupMap = {};

  for (const entry of data) {
    for (const [id, g] of Object.entries(entry.groups)) {
      if (!groupMap[id]) {
        groupMap[id] = {
          name: g.name,
          data: []
        };
      }
    }
  }

  for (const id in groupMap) {
    groupMap[id].data = data.map(d => d.groups?.[id]?.memberCount ?? null);
  }

  const ctx = document.getElementById("chart");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: Object.entries(groupMap).map(([id, g], i) => ({
        label: g.name,
        data: g.data,
        borderColor: getColor(i),
        fill: false,
        tension: 0.2
      }))
    }
  });

  showStatus("✅ Loaded successfully");
}

function applyFilter() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const filtered = filterData(rawData, start, end);
  renderChart(filtered);
}

async function init() {
  rawData = await loadData();

  if (!rawData.length) {
    showStatus("⚠️ No data yet (run GitHub Actions first)");
    return;
  }

  renderChart(rawData);
}

init();