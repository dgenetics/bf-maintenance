# Maintenance date buckets

Maintenance partitions open tasks into Overdue, Due soon (within 7 days), and Upcoming by due date versus today (not a stored lane status).

## Sub-features

- `bucket-overdue` section for past-due open tasks.
- `bucket-due-soon` section for due within ~7 days.
- `bucket-upcoming` section for later open tasks.
- `bucket-suggest` optional Suggest tasks control on the same page (see suggest-tasks.md).

## How to get to it (user POV)

- Bottom nav → Maintenance (`/maintenance`).
- From Systems, open Maintenance.

## Driving it with Playwright

Preconditions:

- Unlocked; doctor green.
- Tasks may be empty — empty copy is still a valid section render.

- **Open maintenance.** Run `node scripts/drive.mjs --feature maintenance-buckets --base-url <url>` (or click nav link `Maintenance`). Wait for page heading `getByRole('heading', { level: 2, name: 'Maintenance' })` — not bare `heading`/`Maintenance`, which also matches Layout chrome h1.
- **Sections present.** Text headings/labels `Overdue`, `Due soon`, and `Upcoming` are visible (counts may be zero). Capture `maintenance-buckets.png`.
- **Proof.** Screenshot + aria snapshot identify the three buckets. For data correctness, compare an open task’s due date to local `partitionTasksByDueDate` rules in `src/lib/maintenance.ts` — a past-due task must not appear only under Upcoming.

## Gotchas

- Layout sticky header is always an h1 `Maintenance`; the page title is PageHeader h2 `Maintenance`. Use `level: 2` (or `main` landmark) so Playwright strict mode does not collide.
- Do not reintroduce AiEA icebox/backlog/current lanes here.
- Stored task status can be stale; UI buckets by due date vs today on purpose.

- Live bare `GET /api/tasks` may 500; doctor uses `?open=1`. UI `listTasks()` without params can error until product fixes the unfiltered query.
