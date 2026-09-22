# verify-bf-maintenance 20260921T234850Z-2b04c0d
- sha: `2b04c0d0b05a55acbad0e4c44841521f985ba4c4`
- started: 2026-09-21T23:48:50Z
- feature: `maintenance-buckets`
- base: https://bf-maintenance.vercel.app
- doctor exit: 0
- drive (maintenance-buckets) exit: 0
- drive steps:
  - bucket visible: Overdue
  - bucket visible: Due soon
  - bucket visible: Upcoming
- result: **PASS**
- finished: 2026-09-21T23:48:55Z
- evidence: `/workspace/repos/bf-maintenance/.cursor/skills/verify-bf-maintenance/evidence/20260921T234850Z-2b04c0d`

## Notes
- Proves skill-side selector tighten after PR #4 flake: bare `getByRole('heading', { name: 'Maintenance' })` strict-mode collision (Layout chrome h1 + PageHeader h2). Drive now uses `level: 2` + `exact: true`.
- Live `https://bf-maintenance.vercel.app`; doctor green; buckets Overdue / Due soon / Upcoming visible.
- Skill-only; no product UI change. Lens optional.
