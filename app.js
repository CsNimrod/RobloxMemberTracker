let rawData = [];
let chart = null;

const statusBox = document.getElementById("status");

function showStatus(msg) {
  statusBox.innerText = msg;
  console.log(msg);
}

function getColor(i) {
  const colors = ["red","blue","green","orange","purple","cyan","gold","pink"];
  return colors[i % colors.length];
}

async function loadData() {
  try {
    const res = await fetch("data/members.json");

    if (!res.ok) {
      showStatus("⚠️ No data file found (run GitHub Actions first)");
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      showStatus("⚠️ Invalid JSON format");
      return [];
    }

    return data;
  } catch (err) {
    console.error(err);
    showStatus("❌ Failed to load data file");
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
  if (chart) chart.destroy();

  if (!data || !data.length) {
    showStatus("⚠️ No data available");
    return;
  }

  const labels = data.map(d => d.date);

  const groupMap = {};

  // SAFE LOOP (prevents crash)
  for (const entry of data) {
    if (!entry || !entry.groups) continue;

    for (const [id, g] of Object.entries(entry.groups || {})) {
      if (!groupMap[id]) {
        groupMap[id] = {
          name: g?.name || id,
          data: []
        };
      }
    }
  }

  for (const id in groupMap) {
    groupMap[id].data = data.map(d =>
      d?.groups?.[id]?.memberCount ?? null
    );
  }

  const ctx = document.getElementById("chart");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: Object.values(groupMap).map((g, i) => ({
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
  render(filtered);
}

async function init() {
  showStatus("Loading data...");

  rawData = await loadData();

  console.log("RAW DATA:", rawData);

  render(rawData);
}

init();