# Maintenance date buckets

## Sub-features
- Overdue / Due soon (≤7d) / Upcoming sections
- Bucket by **due date vs today**, not stored urgency status
- Relative overdue label on cards when easy

## How to get to it (user POV)
Bottom/nav → Maintenance (`/maintenance`).

## Driving it with curl / browser
`GET /api/tasks` with session; partition open tasks by due date locally the same way `partitionTasksByDueDate` does in `src/lib/maintenance.ts`. A task due in the past must not sit only under Upcoming.

## Gotchas
- Do not reintroduce icebox/backlog/current lanes here.
