# Suggest tasks

Suggest tasks walks components with schedules and creates missing open tasks so Maintenance buckets populate without hand-entering each due item.

## Sub-features

- `suggest-page` Maintenance header control Suggest tasks.
- `suggest-component` per-component Suggest on component detail.
- `suggest-idempotent` second run reports no new tasks when open ones already exist.

## How to get to it (user POV)

- Maintenance → Suggest tasks.
- Component detail → Suggest tasks.

## Driving it with Playwright

Preconditions:

- Unlocked; preferably local instance with known schedules.
- On live: treat as mutation — skip unless explicitly testing and you can complete/cancel leftovers.

- **Open maintenance.** Go to `/maintenance`. Button `Suggest tasks` visible.
- **Run (local).** Click `Suggest tasks`; wait for info banner (`Created N task(s)` / no new tasks / no schedules). Reload buckets; new opens appear under Overdue / Due soon / Upcoming as due dates dictate.
- **Proof.** Banner text + task list change (screenshot before/after) or `GET /api/tasks` count delta on local.

## Gotchas

- Without schedules, suggest only informs — it does not invent work.
- Idempotent when open tasks already cover schedules; do not expect infinite growth.
