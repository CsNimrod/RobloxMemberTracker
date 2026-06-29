const fs = require("fs");
const path = require("path");

const GROUP_IDS = process.env.GROUP_IDS?.split(",").map(x => x.trim());

const DATA_PATH = path.join(__dirname, "..", "data", "members.json");

if (!GROUP_IDS || !GROUP_IDS.length) {
  console.error("Missing GROUP_IDS");
  process.exit(1);
}

async function fetchGroup(id) {
  const res = await fetch(`https://groups.roblox.com/v1/groups/${id}`);

  if (!res.ok) throw new Error(`Failed group ${id}`);

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
    history = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8") || "[]");
  }

  const groups = {};

  for (const id of GROUP_IDS) {
    try {
      const g = await fetchGroup(id);

      groups[id] = {
        name: g.name,
        memberCount: g.memberCount
      };

    } catch (e) {
      console.log(`Failed ${id}, using fallback`);

      groups[id] = {
        name: `Group ${id}`,
        memberCount: 0
      };
    }
  }

  const existing = history.find(x => x.date === today);

  if (existing) {
    existing.groups = groups;
  } else {
    history.push({ date: today, groups });
  }

  history.sort((a, b) => a.date.localeCompare(b.date));

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });

  fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2));

  console.log("Saved clean dataset for", today);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});