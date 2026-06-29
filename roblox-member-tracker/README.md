# Roblox Group Member Tracker

A small static site that tracks a Roblox group's member count over time and
publishes it as a GitHub Pages site. A GitHub Actions workflow checks the
member count once a day (and on demand) and commits the result, so the
whole thing runs for free with no server and no database.

```
.
├── .github/workflows/track-members.yml   # the daily "cron job"
├── scripts/fetch-members.js              # calls the Roblox API, updates data file
├── data/members.json                     # the history (this is your "database")
├── index.html
├── style.css
└── app.js                                # chart + drag-to-select + date filter
```

## Why GitHub Actions instead of Google APIs

GitHub Pages only serves static files — it can't run a script on a timer by
itself, and it can't run anything server-side at all. Google Sheets/Apps
Script *can* poll on a schedule, but wiring it up means creating a Google
Cloud project, an API key or service account, and pulling that data into
the page client-side (which also runs into CORS issues calling Roblox
directly from a browser).

GitHub Actions already gives you a free, built-in scheduler, and committing
`data/members.json` straight back into the repo means the Pages site that
reads it needs zero configuration, zero secrets, and zero extra services.
That's why this version skips Google APIs entirely — it's the simpler path
to the thing you actually asked for ("function with GitHub so I can make it
a GitHub website"). If you'd genuinely prefer Google Sheets as the backing
store, that's doable too — just say so and the workflow step can be swapped
for one that writes to a sheet instead of a JSON file.

## Setup

### 1. Create the repo
Create a new GitHub repository and add all the files in this project to it
(commit + push), keeping the folder structure exactly as-is — the workflow
**must** live at `.github/workflows/track-members.yml`.

### 2. Find your group's ID
Open your group's page on roblox.com. The ID is the number in the URL:
`https://www.roblox.com/groups/123456789/My-Group` → the ID is `123456789`.

### 3. Tell the workflow which group to track
In your repo: **Settings → Secrets and variables → Actions → Variables tab
→ New repository variable**
- Name: `ROBLOX_GROUP_ID`
- Value: the numeric ID from step 2

(It's a "variable," not a "secret," because a group ID isn't sensitive —
but either works.)

### 4. Let the workflow push commits
By default, new repos restrict what the built-in `GITHUB_TOKEN` can do. Go
to **Settings → Actions → General → Workflow permissions** and select
**"Read and write permissions,"** then save. Without this, the workflow
will fail at the commit/push step.

### 5. Get your first data point
Go to the **Actions** tab → **Track Roblox Group Members** → **Run
workflow**. This runs it immediately instead of waiting for the daily
schedule, and creates the first entry in `data/members.json`.

### 6. Turn on GitHub Pages
**Settings → Pages → Source: Deploy from a branch → Branch: `main`,
folder: `/ (root)` → Save.** GitHub gives you a URL like
`https://your-username.github.io/your-repo-name/`. Every time the workflow
commits new data, Pages automatically rebuilds.

### 7. Personalize it
Open `app.js` and change `CONFIG.groupName` at the top to your group's
display name.

That's it — the page will be empty until step 5 has run once, then it
fills in automatically every day after.

## Using the dashboard
- **Drag across the chart** to highlight a stretch and see the member
  difference between the two points you dragged over.
- **Type two dates** in the "Look at a specific period" section and click
  **Apply** to zoom the chart to just that window (and see the change over
  it). **Reset** goes back to the full history.

## Changing the schedule
The cron line in `track-members.yml` is `0 6 * * *` — 06:00 UTC, every day.
Edit the five fields (minute, hour, day-of-month, month, day-of-week) to
change it. GitHub Actions schedules run in UTC and can occasionally be
delayed by a few minutes during busy periods — that's a GitHub platform
limitation, not a bug in this project. `workflow_dispatch` is always there
as a manual backup.

## Notes
- `memberCount` comes from Roblox's public group-info endpoint
  (`groups.roblox.com/v1/groups/{groupId}`), which doesn't require
  authentication and is unaffected by Roblox's January 2026 member-*list*
  privacy setting (that change restricts the list of individual members,
  not the aggregate count).
- If the workflow ever fails with a non-200 from Roblox, check the Actions
  log — Roblox occasionally rate-limits or has brief outages, and the run
  will simply fail without touching your data (the next scheduled run will
  try again).
