# Roblox Member Tracker

Tracks multiple Roblox group member counts daily using GitHub Actions.

## Setup

1. Add repository variable:

ROBLOX_GROUP_IDS=123,456,789

2. Enable GitHub Actions

3. Enable GitHub Pages:
- Source: Deploy from branch
- Branch: main
- Folder: /root

## What it does

- Fetches member counts daily
- Stores history in data/members.json
- Builds multi-line chart per group
- Lets you toggle groups on/off