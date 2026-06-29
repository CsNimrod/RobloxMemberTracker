// app.js
//
// Loads data/members.json, draws the chart, and powers the two ways of
// comparing two points in time:
//   1. Click and drag across the chart.
//   2. Type two dates into the "From" / "To" fields and click Apply.

// ---- Edit this to match your group ------------------------------------
const CONFIG = {
  groupName: "Your Group Name",
  dataUrl: "data/members.json",
};
// -------------------------------------------------------------------------

let rawData = [];   // full history: [{ date: "YYYY-MM-DD", memberCount: N }, ...]
let viewData = [];  // the slice currently drawn on the chart
let chart = null;

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheEls();
  els.groupName.textContent = CONFIG.groupName;

  try {
    const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${CONFIG.dataUrl} (${res.status})`);
    rawData = await res.json();
  } catch (err) {
    console.error(err);
    rawData = [];
  }

  if (!Array.isArray(rawData) || rawData.length === 0) {
    els.emptyState.hidden = false;
    els.dashboard.hidden = true;
    return;
  }

  rawData.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  viewData = rawData;

  populateDateInputs();
  renderStats();
  renderChart();
  bindSelectionEvents();
  bindControlEvents();
}

function cacheEls() {
  [
    "group-name", "current-count", "current-date", "delta-today", "delta-week",
    "ath-count", "chart", "chart-wrapper", "selection-band", "result-card",
    "result-text", "clear-result", "from-date", "to-date", "apply-range",
    "reset-range", "range-message", "empty-state", "dashboard",
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function toCamel(id) {
  return id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

/* ----------------------------------------------------------------------
   Stats strip
---------------------------------------------------------------------- */
function renderStats() {
  const last = rawData[rawData.length - 1];
  const prevDay = rawData[rawData.length - 2];
  const sevenAgo = rawData[rawData.length - 8]; // 7 snapshots back

  els.currentCount.textContent = formatNum(last.memberCount);
  els.currentDate.textContent = formatDate(last.date);

  setDelta(els.deltaToday, prevDay ? last.memberCount - prevDay.memberCount : null);
  setDelta(els.deltaWeek, sevenAgo ? last.memberCount - sevenAgo.memberCount : null);

  const ath = rawData.reduce((m, d) => Math.max(m, d.memberCount), -Infinity);
  els.athCount.textContent = formatNum(ath);
}

function setDelta(el, diff) {
  if (diff === null || diff === undefined) {
    el.textContent = "—";
    el.classList.remove("pos", "neg");
    return;
  }
  const sign = diff > 0 ? "+" : "";
  el.textContent = `${sign}${formatNum(diff)}`;
  el.classList.toggle("pos", diff > 0);
  el.classList.toggle("neg", diff < 0);
}

/* ----------------------------------------------------------------------
   Chart
---------------------------------------------------------------------- */
function renderChart() {
  if (chart) chart.destroy();

  const ctx = els.chart.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, els.chartWrapper.clientHeight || 320);
  gradient.addColorStop(0, "rgba(110, 231, 183, 0.25)");
  gradient.addColorStop(1, "rgba(110, 231, 183, 0)");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: viewData.map((d) => d.date),
      datasets: [
        {
          data: viewData.map((d) => d.memberCount),
          borderColor: "#6ee7b7",
          backgroundColor: gradient,
          fill: true,
          tension: 0.25,
          pointRadius: viewData.length > 90 ? 0 : 2,
          pointHoverRadius: 4,
          pointBackgroundColor: "#6ee7b7",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1a212b",
          borderColor: "#232b36",
          borderWidth: 1,
          titleColor: "#e7ebf0",
          bodyColor: "#e7ebf0",
          titleFont: { family: "JetBrains Mono", size: 12 },
          bodyFont: { family: "JetBrains Mono", size: 12 },
          padding: 10,
          callbacks: {
            title: (items) => formatDate(items[0].label),
            label: (item) => `${formatNum(item.parsed.y)} members`,
          },
        },
      },
      scales: {
        x: {
          type: "category",
          grid: { display: false },
          ticks: {
            color: "#8b96a5",
            font: { family: "JetBrains Mono", size: 11 },
            maxRotation: 0,
            autoSkip: true,
            callback: (value) => {
              const label = viewData[value]?.date;
              return label ? formatDateShort(label) : "";
            },
          },
        },
        y: {
          grid: { color: "#1a212b" },
          ticks: {
            color: "#8b96a5",
            font: { family: "JetBrains Mono", size: 11 },
            callback: (v) => formatNum(v),
          },
        },
      },
    },
  });

  // A fresh chart means any previous selection no longer lines up.
  hideBand();
  els.resultCard.hidden = true;
}

/* ----------------------------------------------------------------------
   Drag-to-select on the chart
---------------------------------------------------------------------- */
let drag = { active: false, startIndex: null };

function bindSelectionEvents() {
  const canvas = els.chart;

  canvas.addEventListener("mousedown", (e) => startDrag(clientXOf(e)));
  canvas.addEventListener("mousemove", (e) => moveDrag(clientXOf(e)));
  window.addEventListener("mouseup", endDrag);

  canvas.addEventListener(
    "touchstart",
    (e) => startDrag(clientXOf(e.touches[0])),
    { passive: true }
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (drag.active) e.preventDefault(); // stop the page from scrolling mid-drag
      moveDrag(clientXOf(e.touches[0]));
    },
    { passive: false }
  );
  window.addEventListener("touchend", endDrag);

  els.clearResult.addEventListener("click", () => {
    hideBand();
    els.resultCard.hidden = true;
  });
}

function clientXOf(e) {
  const rect = els.chart.getBoundingClientRect();
  return e.clientX - rect.left;
}

function startDrag(pixelX) {
  if (!chart) return;
  drag.active = true;
  drag.startIndex = pixelToIndex(pixelX);
  showBandBetween(drag.startIndex, drag.startIndex);
}

function moveDrag(pixelX) {
  if (!drag.active || !chart) return;
  const currentIndex = pixelToIndex(pixelX);
  showBandBetween(drag.startIndex, currentIndex);
}

function endDrag() {
  if (!drag.active) return;
  drag.active = false;
  // If the user just clicked without moving, ignore it.
  if (drag.startIndex === null) return;
  const band = els.selectionBand;
  if (band.dataset.endIndex === undefined) return;
  const endIndex = Number(band.dataset.endIndex);
  if (endIndex === drag.startIndex) {
    hideBand();
    return;
  }
  showRangeResult(drag.startIndex, endIndex);
}

function pixelToIndex(pixelX) {
  const xScale = chart.scales.x;
  const n = viewData.length;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < n; i++) {
    const px = xScale.getPixelForValue(i);
    const dist = Math.abs(px - pixelX);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function showBandBetween(i1, i2) {
  if (!chart) return;
  const xScale = chart.scales.x;
  const lo = Math.min(i1, i2);
  const hi = Math.max(i1, i2);
  const left = xScale.getPixelForValue(lo);
  const right = xScale.getPixelForValue(hi);

  const band = els.selectionBand;
  band.style.left = `${left}px`;
  band.style.width = `${Math.max(right - left, 2)}px`;
  band.style.top = `${chart.chartArea.top}px`;
  band.style.height = `${chart.chartArea.bottom - chart.chartArea.top}px`;
  band.dataset.endIndex = i2;
  band.hidden = false;
}

function hideBand() {
  els.selectionBand.hidden = true;
  delete els.selectionBand.dataset.endIndex;
  drag.startIndex = null;
}

function showRangeResult(i1, i2) {
  const lo = Math.min(i1, i2);
  const hi = Math.max(i1, i2);
  const start = viewData[lo];
  const end = viewData[hi];
  const diff = end.memberCount - start.memberCount;
  const pct = start.memberCount !== 0 ? (diff / start.memberCount) * 100 : null;
  const sign = diff > 0 ? "+" : "";
  const pctText = pct === null ? "" : ` (${sign}${pct.toFixed(1)}%)`;

  els.resultText.innerHTML = `
    <span>${formatDate(start.date)} · ${formatNum(start.memberCount)}</span>
    <span class="r-arrow">→</span>
    <span>${formatDate(end.date)} · ${formatNum(end.memberCount)}</span>
    <span class="r-diff ${diff >= 0 ? "pos" : "neg"}">${sign}${formatNum(diff)}${pctText}</span>
  `;
  els.resultCard.hidden = false;
}

/* ----------------------------------------------------------------------
   Manual date range
---------------------------------------------------------------------- */
function populateDateInputs() {
  const min = rawData[0].date;
  const max = rawData[rawData.length - 1].date;
  [els.fromDate, els.toDate].forEach((input) => {
    input.min = min;
    input.max = max;
  });
}

function bindControlEvents() {
  els.applyRange.addEventListener("click", applyDateRange);
  els.resetRange.addEventListener("click", resetDateRange);
}

function applyDateRange() {
  const from = els.fromDate.value;
  const to = els.toDate.value;
  els.rangeMessage.hidden = true;

  if (from && to && from > to) {
    els.rangeMessage.textContent = '"From" date must be before "To" date.';
    els.rangeMessage.hidden = false;
    return;
  }

  let filtered = rawData;
  if (from) filtered = filtered.filter((d) => d.date >= from);
  if (to) filtered = filtered.filter((d) => d.date <= to);

  if (filtered.length === 0) {
    els.rangeMessage.textContent = "No recorded data falls in that range yet.";
    els.rangeMessage.hidden = false;
    return;
  }

  viewData = filtered;
  renderChart();

  if (viewData.length > 1) {
    showRangeResult(0, viewData.length - 1);
  }
}

function resetDateRange() {
  els.fromDate.value = "";
  els.toDate.value = "";
  els.rangeMessage.hidden = true;
  viewData = rawData;
  renderChart();
}

/* ----------------------------------------------------------------------
   Formatting helpers
---------------------------------------------------------------------- */
function formatNum(n) {
  return Math.round(n).toLocaleString();
}

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
