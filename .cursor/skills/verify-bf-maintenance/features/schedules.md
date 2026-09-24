# Schedules

Schedules attach recurring (or one-shot) maintenance plans to a component: name, frequency, next due date. Creating a schedule can materialize an open task. The bottom-nav **Schedules** tab (`/schedules`) lists plans across all systems.

## Sub-features

- `schedule-list-page` bottom tab `/schedules` shows all schedules (or empty).
- `schedule-list` also shows schedules on the component detail page.
- `schedule-create` Add schedule form with inline `embedActions` (Save/Cancel).
- `schedule-delete` removes a schedule after confirm.

## How to get to it (user POV)

- Bottom nav → Schedules (`/schedules`).
- Systems → open a system → open a component → Maintenance schedules.
- Deep link `/assets/:systemId/components/:componentId`.

## Driving it with Playwright

Preconditions:

- Unlocked.
- Prefer local disposable DB for create/delete; on live / CI, stay read-only (no junk creates).

- **Open Schedules tab.** Unlock if needed; click nav link `Schedules` (or go to `/schedules`). Wait for h2 `Schedules`.
- **Read-only proof.** Assert page renders: list chrome (`Search schedules`) and/or empty copy matching `/No schedules/i` (e.g. `No schedules — add one`). Screenshot + aria. Do not create schedules in CI.
- **Create (local only, optional).** Click header CTA `Add schedule`, fill Schedule name, submit Save; expect success and a new row. Delete afterward if created for verification.
- **API assist.** `GET /api/schedules?componentId=` (as implemented) with session cookie returns JSON for that component.

## Gotchas

- Live production data is real farm state — do not leave verify-* schedules behind.
- Auto-materialize on Chores (separate feature) needs at least one schedule to create work.
- Empty title copy is `No schedules — add one` (not bare `No schedules yet` on the global tab).

- Header CTA on `/schedules` is **+ Add schedule** (not a page-name badge). PageHeader no longer has a body Add; empty-state Add may still appear when the list is empty.
- List filters are **System** + search only — Component and Urgency filter controls (and `?component=` / `?urgency=`) were removed. Urgency chips on rows remain.
- Header Add sets `?add=1` briefly; the page opens a vertically centered Add schedule modal and clears the param.
