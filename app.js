let rawData = [];
let chart;

const statusBox = document.getElementById("status");

function status(msg) {
  console.log(msg);
  if (statusBox) statusBox.innerText = msg;
}

function getColor(i) {
  const colors = ["red","blue","green","orange","purple","cyan","gold","pink"];
  return colors[i % colors.length];
}

async function loadData() {
  try {
    const res = await fetch("data/members.json");

    if (!res.ok) {
      status("❌ JSON not found (404)");
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      status("❌ JSON is not array");
      return [];
    }

    return data;
  } catch (e) {
    console.error(e);
    status("❌ Failed to load JSON");
    return [];
  }
}

function filter(data, start, end) {
  return data.filter(d =>
    (!start || d.date >= start) &&
    (!end || d.date <= end)
  );
}

function render(data) {
  const canvas = document.getElementById("chart");

  if (!canvas) {
    status("❌ Canvas not found");
    return;
  }

  if (chart) chart.destroy();

  if (!data.length) {
    status("⚠️ No data to display");
    return;
  }

  const labels = data.map(d => d.date);

  const groups = {};

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

  for (const id in groups) {
    groups[id].data = data.map(d =>
      d?.groups?.[id]?.memberCount ?? null
    );
  }

  try {
    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: Object.values(groups).map((g, i) => ({
          label: g.name,
          data: g.data,
          borderColor: getColor(i),
          fill: false,
          tension: 0.2
        }))
      }
    });

    status("✅ Chart loaded successfully");
  } catch (err) {
    console.error(err);
    status("❌ Chart failed to render (Chart.js issue)");
  }
}

function applyFilter() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  render(filter(rawData, start, end));
}

async function init() {
  status("Loading...");

  if (typeof Chart === "undefined") {
    status("❌ Chart.js not loaded");
    return;
  }

  rawData = await loadData();

  console.log("DATA:", rawData);

  render(rawData);
}

window.addEventListener("DOMContentLoaded", init);