let rawData = [];
let chart = null;

// Which group IDs are currently visible on the chart
let activeGroups = new Set();
// name lookup, built once from the full dataset
let groupNames = {};
// order groups first appeared in, so colors/legend stay stable
let groupOrder = [];

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

// Figure out every group id/name that appears anywhere in the dataset,
// in a stable order, so colors and the legend don't jump around.
function indexGroups(data) {
  groupNames = {};
  groupOrder = [];

  for (const entry of data) {
    const groups = entry?.groups;
    if (!groups || typeof groups !== "object") continue;

    for (const [id, g] of Object.entries(groups)) {
      if (!(id in groupNames)) {
        groupNames[id] = g?.name || id;
        groupOrder.push(id);
      }
    }
  }
}

// Build the clickable legend. Clicking a chip toggles that group on/off.
function buildLegend() {
  const legendEl = document.getElementById("legend");
  if (!legendEl) return;

  legendEl.innerHTML = "";

  groupOrder.forEach((id, i) => {
    const chip = document.createElement("div");
    chip.className = "legend-item" + (activeGroups.has(id) ? "" : " inactive");
    chip.style.borderLeft = `4px solid ${getColor(i)}`;
    chip.textContent = groupNames[id];
    chip.title = "Click to toggle this line";

    chip.addEventListener("click", () => {
      if (activeGroups.has(id)) {
        activeGroups.delete(id);
      } else {
        activeGroups.add(id);
      }
      chip.classList.toggle("inactive", !activeGroups.has(id));
      renderChart(getFilteredData());
    });

    legendEl.appendChild(chip);
  });
}

// Filter rawData by the start/end date inputs. Empty inputs = no bound.
function getFilteredData() {
  const startVal = document.getElementById("startDate")?.value;
  const endVal = document.getElementById("endDate")?.value;

  return rawData.filter(entry => {
    if (startVal && entry.date < startVal) return false;
    if (endVal && entry.date > endVal) return false;
    return true;
  });
}

// Called by the "Apply" button
function applyFilter() {
  const filtered = getFilteredData();

  if (filtered.length === 0) {
    status("⚠️ No data in that date range");
  }

  renderChart(filtered);
}

function renderChart(data) {
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

  const labels = data.map(d => d.date);

  // Only build datasets for groups the user has toggled on
  const visibleIds = groupOrder.filter(id => activeGroups.has(id));

  const datasets = visibleIds.map(id => {
    const colorIndex = groupOrder.indexOf(id);
    const values = data.map(d => d?.groups?.[id]?.memberCount ?? null);

    return {
      label: groupNames[id] || id,
      data: values,
      borderColor: getColor(colorIndex),
      backgroundColor: getColor(colorIndex) + "22",
      borderWidth: 3,
      pointRadius: 2,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: true
    };
  });

  if (datasets.length === 0) {
    status("⚠️ No groups selected — click a legend chip to show a line");
    return;
  }

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
          // Using our own #legend chips instead of Chart.js's built-in legend
          legend: {
            display: false
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

    status(`✅ Chart loaded (${datasets.length} of ${groupOrder.length} groups shown)`);
  } catch (err) {
    console.error(err);
    status("❌ Chart failed to render");
  }
}

// Pre-fill the date inputs with the dataset's actual range
function setDefaultDateRange() {
  if (!rawData.length) return;

  const dates = rawData.map(d => d.date).sort();
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  if (startInput && !startInput.value) startInput.value = dates[0];
  if (endInput && !endInput.value) endInput.value = dates[dates.length - 1];
}

async function init() {
  status("Loading...");

  rawData = await loadData();

  console.log("RAW DATA:", rawData);

  indexGroups(rawData);

  // start with every group visible
  activeGroups = new Set(groupOrder);

  setDefaultDateRange();
  buildLegend();
  renderChart(getFilteredData());
}

window.addEventListener("DOMContentLoaded", init);

// Exposed for the inline onclick="applyFilter()" in index.html
window.applyFilter = applyFilter;