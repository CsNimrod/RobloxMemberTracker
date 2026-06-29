// scripts/fetch-members.js
//
// Calls Roblox's public group-info endpoint, pulls out memberCount, and
// appends (or updates) today's entry in data/members.json.
//
// Runs on Node 18+ (GitHub Actions uses Node 20 — see the workflow file),
// which has `fetch` built in, so there is nothing to npm install.

const fs = require("fs");
const path = require("path");

const GROUP_ID = process.env.GROUP_ID;
const DATA_PATH = path.join(__dirname, "..", "data", "members.json");

if (!GROUP_ID) {
  console.error(
    "Missing GROUP_ID. Set a repository variable named ROBLOX_GROUP_ID " +
      "(Settings -> Secrets and variables -> Actions -> Variables) to your group's numeric ID."
  );
  process.exit(1);
}

async function main() {
  const url = `https://groups.roblox.com/v1/groups/${GROUP_ID}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Roblox API returned ${res.status} ${res.statusText}: ${body}`);
  }

  const group = await res.json();
  const memberCount = group.memberCount;

  if (typeof memberCount !== "number") {
    throw new Error(
      `Roblox API response didn't include a numeric memberCount. Raw response: ${JSON.stringify(group)}`
    );
  }

  // Today's date in UTC, as YYYY-MM-DD.
  const today = new Date().toISOString().slice(0, 10);

  let history = [];
  if (fs.existsSync(DATA_PATH)) {
    const raw = fs.readFileSync(DATA_PATH, "utf-8").trim();
    history = raw ? JSON.parse(raw) : [];
  }

  const existingIndex = history.findIndex((entry) => entry.date === today);
  if (existingIndex >= 0) {
    history[existingIndex].memberCount = memberCount;
    console.log(`Updated today's (${today}) entry: ${memberCount} members`);
  } else {
    history.push({ date: today, memberCount });
    console.log(`Recorded ${memberCount} members for ${today}`);
  }

  history.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
