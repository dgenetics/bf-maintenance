# Maintenance archive

## Sub-features
- Completed tasks retained
- Filter by system / component / completed date range
- Reachable from Maintenance (not only a short “recent” strip)

## How to get to it (user POV)
Maintenance → Archive (`/maintenance/archive`).

## Driving it with curl / browser
`GET /api/tasks` include completed; UI shows them under archive with filters.

## Gotchas
- Archive is history for the farm registry — not AiEA’s DONE board archive.
