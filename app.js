async function loadData() {
  const res = await fetch("data/members.json");
  return await res.json();
}

function getColor(index) {
  const colors = [
    "red", "blue", "green", "orange", "purple",
    "cyan", "magenta", "gold", "teal", "pink"
  ];
  return colors[index % colors.length];
}

function calcGrowth(first, last) {
  if (!first || !last) return 0;
  return ((last - first) / first) * 100;
}

async function render() {
  const data = await loadData();
  if (!data.length) return;

  const labels = data.map(d => d.date);

  // Build group structure
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

  // Growth stats
  const stats = Object.entries(groupMap).map(([id, g]) => {
    const values = g.data.filter(v => v != null);
    const first = values[0];
    const last = values[values.length - 1];
    const growth = calcGrowth(first, last);

    return {
      id,
      name: g.name,
      first,
      last,
      growth
    };
  });

  const best = [...stats].sort((a, b) => b.growth - a.growth)[0];

  // Chart
  const ctx = document.getElementById("chart");

  const chart = new Chart(ctx, {
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

  // Legend
  const legend = document.getElementById("legend");

  Object.entries(groupMap).forEach(([id, g], i) => {
    const item = document.createElement("div");
    item.textContent = g.name;
    item.style.color = getColor(i);

    item.onclick = () => {
      const meta = chart.getDatasetMeta(i);
      meta.hidden = !meta.hidden;
      chart.update();
    };

    legend.appendChild(item);
  });

  // Stats panel
  const statsBox = document.createElement("div");
  statsBox.style.marginTop = "20px";
  statsBox.style.fontSize = "14px";

  statsBox.innerHTML = `
    <h3>📊 Growth Stats</h3>
    <p><b>🏆 Fastest Growing:</b> ${best?.name || "N/A"} (+${best?.growth.toFixed(2)}%)</p>
    <ul>
      ${stats.map(s => `
        <li>
          ${s.name}: ${s.first ?? "?"} → ${s.last ?? "?"}
          (<b>${s.growth.toFixed(2)}%</b>)
        </li>
      `).join("")}
    </ul>
  `;

  document.body.appendChild(statsBox);
}

render();