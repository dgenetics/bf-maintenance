# Completed archive

Archive lists completed maintenance tasks with filters (system, component, completed date range). It is farm history, not an AiEA DONE board.

## Sub-features

- `archive-open` reaches Completed archive from Maintenance.
- `archive-list` shows completed tasks (or empty).
- `archive-filter` filters by system / component / date params in the URL.

## How to get to it (user POV)

- Maintenance → Archive button (`/maintenance/archive`).
- Recently completed → View all / Archive.

## Driving it with Playwright

Preconditions:

- Unlocked; doctor green.

- **Open archive.** Run `node scripts/drive.mjs --feature archive --base-url <url>`. Heading `Completed archive` appears. Capture `archive.png`.
- **Filters (optional manual).** Change `Filter by system` / dates; URL params `system`, `component`, `from`, `to` update; subtitle `N of M completed tasks` stays honest.
- **Proof.** Screenshot of Completed archive; API check `GET /api/tasks?status=COMPLETED` (or equivalent client call) returns JSON when session valid.

## Gotchas

- Incomplete tasks never belong here; open work stays on `/maintenance` buckets.
- Not AiEA’s DONE archive.
