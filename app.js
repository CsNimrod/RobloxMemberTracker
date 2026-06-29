let rawData = [];
let chart = null;

const statusBox = document.getElementById("status");

function status(msg) {
  console.log(msg);
  if (statusBox) statusBox.innerText = msg;
}

function getColor(i) {
  const colors = [
    "red","blue","green","orange","purple",
    "cyan","gold","pink","lime","magenta"
  ];
  return colors[i % colors.length];
}

async function loadData() {
  try {
    const res = await fetch("data/members.json");

    if (!res.ok) {
      status("❌ 404: data/members.json not found");
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
    status("❌ Failed to load JSON");
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

  // ✅ SAFE LOOP (fixes your crash)
  for (const entry of data) {
    if (!entry || !entry.groups) continue;

    for (const [id, g] of Object.entries(entry.groups || {})) {
      if (!groups[id]) {
        groups[id] = {
          name: g?.name || id,
          data: []
        };
      }
    }
  }

  // build dataset safely
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
          tension: 0.25
        }))
      }
    });

    status("✅ Loaded successfully");
  } catch (err) {
    console.error(err);
    status("❌ Chart.js failed to render");
  }
}

function applyFilter() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const filtered = filterData(rawData, start, end);
  render(filtered);
}

async function init() {
  status("Loading...");

  rawData = await loadData();

  console.log("RAW DATA:", rawData);

  render(rawData);
}

window.addEventListener("DOMContentLoaded", init);