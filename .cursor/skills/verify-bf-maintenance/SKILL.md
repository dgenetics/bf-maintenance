---
name: verify-bf-maintenance
description: >-
  Prove bf-maintenance (Beausoleil Farm systems/components + date/schedule
  maintenance) still works before merge/ship. Web UI + Next API. Use when
  changing this repo, before opening or merging a PR, or when asked to verify /
  gate / smoke-test bf-maintenance.
---

# verify-bf-maintenance

Date/schedule product only (Overdue / Due soon / Upcoming + archive). **Not** an AiEA kanban board.

Evidence root (survives cleanup): `.cursor/skills/verify-bf-maintenance/evidence/<run-id>/`

## Launch

Local (agent-owned instance — do not steal the user's browser session):

```bash
cp -n .env.example .env   # if missing; DATABASE_URL=file:./dev.db, BF_ACCESS_PIN set
npm ci
npx prisma migrate deploy   # or migrate dev on a throwaway db file
npm run build
npm run start -- -p 3100    # prefer 3100 so it won't collide with a human on 3000
```

Ready when `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/` is `200` (PIN gate HTML is fine).

Teardown: kill the `next start` PID **you** started (not by process name). Leave evidence dirs alone.

For the **merge gate** you do not need a long-lived server — `doctor` + optional `smoke` is enough.

## Doctor

Read-only health of a checkout / running instance:

```bash
./.cursor/skills/verify-bf-maintenance/scripts/doctor.sh
```

Must pass:

1. `npm run typecheck` (`tsc --noEmit`)
2. `npm run build` (prisma generate + next build)

Optional if `SMOKE_BASE_URL` is set (default `http://127.0.0.1:3100` when a local server is up): PIN login + `GET /api/tasks` returns JSON.

## Drive

Harness v1 = shell + curl (no Playwright required). Auth: `POST /api/auth/login` with `{"pin":"<BF_ACCESS_PIN>"}`; keep `Set-Cookie`.

Primary user paths (see `features/`):

| Feature | Route | Prove |
|---------|-------|-------|
| Pin gate | `/` | login 200 with correct pin; 401 with wrong pin |
| Systems list + search | `/` | `?q=` filters; subtitle count honest |
| Maintenance date buckets | `/maintenance` | open tasks partitioned by due vs today |
| Archive | `/maintenance/archive` | completed tasks listable/filterable |
| Sticky save | `/assets/new` etc. | save control not under bottom tab bar (visual; defer to browser when shipping UI) |

Cheap automated smoke (API, no flaky e2e):

```bash
./.cursor/skills/verify-bf-maintenance/scripts/smoke.sh
```

Requires `BF_ACCESS_PIN` in env (from `.env`) and a reachable `SMOKE_BASE_URL`.

## Evidence

Each gate run writes:

- `evidence/<run-id>/doctor.log` — typecheck + build transcripts + exit codes
- `evidence/<run-id>/smoke.log` — curl results (if smoke ran)
- `evidence/<run-id>/SUMMARY.md` — pass/fail + git sha

Proof standards: exercise real routes/APIs the app ships; record action + result; do not fake green with skipped steps.

## Cleanup

```bash
./.cursor/skills/verify-bf-maintenance/scripts/cleanup.sh
```

Stops only PIDs recorded in `evidence/<run-id>/server.pid`. **Never** deletes `evidence/`.

## Helpers

All under `.cursor/skills/verify-bf-maintenance/scripts/`:

- `doctor.sh` — typecheck + build gate (always)
- `smoke.sh` — PIN + tasks API smoke (when server up)
- `gate.sh` — doctor then smoke if `SMOKE_BASE_URL` answers; writes evidence
- `cleanup.sh` — tear down agent-started server from pidfile

### Merge / ship gate (default)

```bash
./.cursor/skills/verify-bf-maintenance/scripts/gate.sh
```

Exit 0 required before merge. If smoke cannot run (no server), doctor alone is the required gate for v1; note that in SUMMARY.

## Feature map

Index: `features/README.md`. Keep map honest via `/maintain-verification-skill` when routes or auth change.
