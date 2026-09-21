# bf-maintenance feature map

Maintained verification source for Beausoleil Farm date/schedule maintenance. Read this index, then the feature file. Drive the real UI with Playwright (`scripts/drive.mjs`); curl alone is not enough for a mapped UI feature.

## Baseline preconditions

- Base URL: local `http://127.0.0.1:3100` (from `launch.sh`) **or** `https://bf-maintenance.vercel.app`.
- `BF_ACCESS_PIN` set (from `.env` or secrets). Do not commit the pin.
- `doctor.sh` green for that base URL before driving.
- Never attach to a browser session the human already owns; use headless Playwright or a fresh context.
- AiEA kanban lanes (icebox / backlog / current) are **out of scope**.

## Driving conventions

- Harness: `node .cursor/skills/verify-bf-maintenance/scripts/drive.mjs --feature <id> --base-url <url>`.
- Prefer ARIA roles / accessible names (`Access PIN`, `Search systems`, `Unlock`, nav link `Maintenance`). Page titles are PageHeader **h2** — use `getByRole('heading', { level: 2, name: ... })` so Layout chrome h1 `Maintenance` does not collide.
- Start from locked or unlocked state as each recipe’s preconditions state.
- Mutations on live: avoid creating junk; prefer read-only paths (`pin-gate`, search with disposable query, buckets, archive view, sticky-save geometry).
- Restore or avoid fixture pollution; never delete `evidence/` in cleanup.

## Proof and skip reporting

- Capture action + resulting state (screenshot + aria JSON under `evidence/<run-id>/`).
- Record feature id and base URL in `drive-<feature>.json` / `SUMMARY.md`.
- Unreachable path → report attempted command + unmet precondition; do not claim verified via a different entry point.

## Feature entry contract

Each feature file: H1 + one paragraph, then exactly four H2s — `Sub-features`, `How to get to it (user POV)`, `Driving it with Playwright`, `Gotchas`.

## Features

- [Pin gate](./pin-gate.md) — unlock / reject / session.
- [Systems list + search](./systems-list.md) — list, `?q=` sync, honest counts.
- [Maintenance date buckets](./maintenance-buckets.md) — Overdue / Due soon / Upcoming.
- [Completed archive](./archive.md) — history + filters.
- [Sticky save](./sticky-save.md) — Save above bottom tab nav.
- [Schedules](./schedules.md) — per-component maintenance schedules.
- [Suggest tasks](./suggest-tasks.md) — materialize open tasks from schedules.
