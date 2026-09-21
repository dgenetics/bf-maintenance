# Schedules

Schedules attach recurring (or one-shot) maintenance plans to a component: name, frequency, next due date. Creating a schedule can materialize an open task.

## Sub-features

- `schedule-list` shows schedules on the component detail page.
- `schedule-create` Add schedule form with StickySaveBar.
- `schedule-delete` removes a schedule after confirm.

## How to get to it (user POV)

- Systems → open a system → open a component → Maintenance schedules.
- Deep link `/assets/:systemId/components/:componentId`.

## Driving it with Playwright

Preconditions:

- Unlocked; know a real `systemId` / `componentId` (from UI or `GET /api/systems`).
- Prefer local disposable DB for create/delete; on live, stay read-only unless cleaning up.

- **Open component.** Navigate to a component detail URL. Region `Maintenance schedules` visible.
- **Read-only proof.** Screenshot list or empty copy `No schedules yet`.
- **Create (local only).** Click `Add schedule`, fill Schedule name, submit Save; expect success toast/info and a new row. Delete afterward if created for verification.
- **API assist.** `GET /api/schedules?componentId=` (as implemented) with session cookie returns JSON for that component.

## Gotchas

- Live production data is real farm state — do not leave verify-* schedules behind.
- Suggest tasks (separate feature) needs at least one schedule to create work.
