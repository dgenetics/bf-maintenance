# Move component between systems

From component detail overflow, move a part to another system; schedules/chores stay on the component.

## Sub-features

- `move-sheet` opens from ⋯ → Move to another system…
- `move-confirm` shows confirm copy then PATCH + navigate
- `move-registry` source drops the part; target gains it

## How to get to it (user POV)

- Unlock → open a system → open a component detail
- ⋯ → Move to another system… → pick system → Move

## Driving it with Playwright

Preconditions:

- Unlocked session
- At least two systems (drive seeds via API if needed) and one component

- Run `node scripts/drive.mjs --feature move-component --base-url <url>`.
- Assert dialog title **Move to another system**, helper **Schedules and chores stay with this part.**, search **Search systems**.
- Confirm → **Move**; URL becomes `/assets/:newSystemId/components/:componentId`.
- `GET /api/systems` proves registry reparent.

## Gotchas

- Menu item is disabled when only one system exists (`No other systems to move to.`).
- Schedules/tasks hang on `componentId` — no reparent required.
- Drive logs in via `POST /api/auth/login` before seeding so `page.request` carries the session cookie.
