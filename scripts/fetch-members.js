const fs = require("fs");
const path = require("path");

const GROUP_IDS = process.env.GROUP_IDS
  ?.split(",")
  .map(id => id.trim())
  .filter(Boolean);

const DATA_PATH = path.join(__dirname, "..", "data", "members.json");

if (!GROUP_IDS?.length) {
  console.error("Missing GROUP_IDS (comma-separated list).");
  process.exit(1);
}

async function fetchGroup(id) {
  const url = `https://groups.roblox.com/v1/groups/${id}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed group ${id}: ${res.status}`);
  }

  const data = await res.json();

  return {
    id,
    name: data.name,
    memberCount: data.memberCount
  };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  let history = [];
  if (fs.existsSync(DATA_PATH)) {
    const raw = fs.readFileSync(DATA_PATH, "utf8").trim();
    history = raw ? JSON.parse(raw) : [];
  }

  const groups = {};

  for (const id of GROUP_IDS) {
    const g = await fetchGroup(id);
    groups[id] = {
      name: g.name,
      memberCount: g.memberCount
    };
    console.log(`${g.name}: ${g.memberCount}`);
  }

  const existing = history.find(e => e.date === today);

  if (existing) {
    existing.groups = groups;
    console.log(`Updated ${today}`);
  } else {
    history.push({ date: today, groups });
    console.log(`Recorded ${today}`);
  }

  history.sort((a, b) => a.date.localeCompare(b.date));

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});