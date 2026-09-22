---
name: verify-bf-maintenance
description: >-
  Drive bf-maintenance (Beausoleil Farm date/schedule maintenance web app) like
  a user: launch, doctor instance health, Playwright paths for pin gate /
  systems / buckets / archive / sticky save. Use before merge/ship or when asked
  to verify this repo. Not AiEA kanban.
---

# verify-bf-maintenance

Beausoleil Farm **date/schedule** maintenance app (systems, components, schedules, tasks, Overdue / Due soon / Upcoming, archive). Web UI + Next API. **Not** AiEA kanban.

Evidence root (survives cleanup): `.cursor/skills/verify-bf-maintenance/evidence/<run-id>/`

Default live target: `https://bf-maintenance.vercel.app` (PIN from `BF_ACCESS_PIN`; team test pin may be shared out-of-band). Prefer an agent-owned local instance on port **3100** when mutating data.

## Launch

Agent-owned local instance (do not hijack a human session on :3000):

```bash
# once per machine for the Playwright helper
(cd .cursor/skills/verify-bf-maintenance/scripts && npm install)

./.cursor/skills/verify-bf-maintenance/scripts/launch.sh 3100
# prints run-id; ready when GET http://127.0.0.1:3100/ → 200
```

`launch.sh` builds if needed, copies a disposable DB under the evidence run dir, starts `next start -p 3100 -H 127.0.0.1`, writes `evidence/<run-id>/server.pid`.

Or point at live / already-running:

```bash
export VERIFY_BASE_URL=https://bf-maintenance.vercel.app
export BF_ACCESS_PIN   # from .env or secrets
```

Teardown: `./.cursor/skills/verify-bf-maintenance/scripts/cleanup.sh [run-id]` — kills only the PID in that run’s `server.pid`. Never deletes `evidence/`.

## Doctor

Instance health (port, auth, data plane) — **not** a compile-only gate:

```bash
VERIFY_BASE_URL=… BF_ACCESS_PIN=… \
  ./.cursor/skills/verify-bf-maintenance/scripts/doctor.sh
```

Must pass:

1. `GET /` → 200
2. Wrong PIN → `401`/`403` on `POST /api/auth/login`
3. Correct PIN → 200 + `bf_session` cookie
4. `GET /api/auth/me` → authenticated
5. `GET /api/systems` and `GET /api/tasks` → JSON arrays

Reports `repo_sha` + `package_version`. Compile (`npm run typecheck` / `build`) may be run separately before ship; it is **not** a substitute for doctor.

## Drive

Harness: **Playwright** via `playwright-core` + system Chrome (`channel: 'chrome'`).

```bash
(cd .cursor/skills/verify-bf-maintenance/scripts && npm install)  # once

node .cursor/skills/verify-bf-maintenance/scripts/drive.mjs \
  --feature pin-gate \
  --base-url "$VERIFY_BASE_URL" \
  --run-id "$VERIFY_RUN_ID"
```

Features: `pin-gate` | `systems-list` | `maintenance-buckets` | `archive` | `sticky-save`.

Stable handles: `getByLabel('Access PIN')`, `getByRole('button', { name: 'Unlock' })`, `getByLabel('Search systems')`, nav link `Maintenance`, page headings via `getByRole('heading', { level: 2, name: ... })` for `Systems` / `Maintenance` / `Completed archive` / `Add system` (Layout chrome is a separate h1 `Maintenance` — never use bare `heading` name `Maintenance`).

Recipes live in `features/`. Prefer those over inventing selectors.

## Evidence

Each run writes under `evidence/<run-id>/`:

| Artifact | Meaning |
|----------|---------|
| `SUMMARY.md` | pass/fail, sha, feature, steps |
| `doctor.txt` | instance health transcript |
| `drive.txt` / `drive-<feature>.json` | Playwright steps |
| `*.png` / `*.aria.json` | screenshots + a11y snapshots |
| `server.pid` / `server.txt` | local launch only |

Proof bar: real user path (UI), capture action + resulting state, keep evidence after cleanup.

## Cleanup

```bash
./.cursor/skills/verify-bf-maintenance/scripts/cleanup.sh [run-id]
```

Stops recorded PIDs only. Evidence dirs stay.

## Helpers

All under `.cursor/skills/verify-bf-maintenance/scripts/`:

| Script | Role |
|--------|------|
| `launch.sh [port] [run-id]` | Start local `:3100` (default), pidfile in evidence |
| `doctor.sh [base-url]` | Instance health |
| `drive.mjs --feature …` | Playwright user-path driver |
| `gate.sh [--local] [--feature …]` | doctor + drive + SUMMARY |
| `cleanup.sh [run-id]` | Tear down agent server |

### One-shot gate (preferred)

```bash
# against live
BF_ACCESS_PIN=… VERIFY_BASE_URL=https://bf-maintenance.vercel.app \
  ./.cursor/skills/verify-bf-maintenance/scripts/gate.sh --feature pin-gate

# local agent instance
BF_ACCESS_PIN=… \
  ./.cursor/skills/verify-bf-maintenance/scripts/gate.sh --local --feature pin-gate
```

## Feature map

Index: `features/README.md`. Keep honest with `/maintain-verification-skill` when routes or auth change.
