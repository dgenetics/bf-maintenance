# Auto-materialize

Chores (`/maintenance`) silently materializes missing open tasks for all schedules on load (and Refresh). Idempotent: one open task per schedule; no Suggest button.

## Sub-features

- `materialize-on-chores-load` visiting `/maintenance` calls `GET /api/tasks/suggest?all=1` before listing tasks.
- `materialize-idempotent` second visit creates no duplicate open tasks when coverage already exists.
- `materialize-no-suggest-ui` no Suggest tasks / Force sync controls on Chores or component detail.

## How to get to it (user POV)

- Bottom nav → Chores (`/maintenance`), or Refresh on that page.
- Component detail: creating a schedule still silently suggests for that component only (no button).

## Driving it with Playwright

Preconditions:

- Unlocked; preferably local instance with a known schedule that has no open task.
- On live: treat as mutation — skip unless explicitly testing and you can complete/cancel leftovers.

- **Open Chores.** Go to `/maintenance`. Heading `Chores` (h2). Assert no button named `Suggest tasks`.
- **Prove (local).** Ensure a schedule exists without an open task (API or UI). Visit `/maintenance`; after load, that schedule’s task appears under Overdue / Due soon / Upcoming as due date dictates. Reload again — count of open tasks for that schedule stays one.
- **Proof.** Screenshot buckets after first visit; optional `GET /api/tasks?open=1` count delta on local. Aria must not list a Suggest tasks button.

## Gotchas

- Without schedules, materialize does nothing — it does not invent work.
- Failures from materialize should surface as page error but listing still attempts to load.
- Per-component `GET /api/tasks/suggest?componentId=` remains for the create-schedule path; do not require a UI button.
