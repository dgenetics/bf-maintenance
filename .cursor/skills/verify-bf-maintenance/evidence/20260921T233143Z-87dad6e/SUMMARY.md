# verify-bf-maintenance 20260921T233143Z-87dad6e
- sha: `87dad6ebdb5e0d15e8a201fa26b0f2e2f860c767`
- started: 2026-09-21T23:31:43Z
- feature: `pin-gate`
- base: https://bf-maintenance.vercel.app
- doctor exit: 0
- drive (pin-gate) exit: 0
- drive steps:
  - locked: heading Maintenance access visible
  - wrong pin: Incorrect PIN shown
  - right pin: Systems heading + Beausoleil Farm chrome
- result: **PASS**
- finished: 2026-09-21T23:31:49Z
- evidence: `/workspace/repos/bf-maintenance/.cursor/skills/verify-bf-maintenance/evidence/20260921T233143Z-87dad6e`

## Notes
- Proven against live `https://bf-maintenance.vercel.app` with `BF_ACCESS_PIN` from env (team test pin; not committed).
- Doctor checked: root 200, wrong/right PIN, session `/api/auth/me`, `/api/systems`, `/api/tasks?open=1`.
- Drive: Playwright pin-gate (locked → wrong → unlock → Systems).
- Informational: bare `GET /api/tasks` returned 500 on live; open filter works. `Maintenance.tsx` still calls bare listTasks() — product gap outside this skill PR.
- Cleanup does not delete this evidence directory.
