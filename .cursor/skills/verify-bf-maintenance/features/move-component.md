# Move component between systems

From a system page part row (or component detail overflow), move a part to another system; schedules/chores stay on the component.

## Sub-features

- `move-sheet` opens from part-row ⋯ → Move to another system… (primary) or ComponentDetail ⋯
- `move-confirm` shows confirm copy then PATCH; system page stays put, detail navigates
- `move-registry` source drops the part; target gains it

## How to get to it (user POV)

- Unlock → open a system → on a part row, ⋯ → Move to another system… → pick system → Move
- (Secondary) Calendar icon → component detail → ⋯ → Move…

## Driving it with Playwright

Preconditions:

- Unlocked session
- At least two systems (drive seeds via API if needed) and one component

- Run `node scripts/drive.mjs --feature move-component --base-url <url>`.
- Open `/assets/:sourceId` (system detail). Open part-row **More actions** → **Move to another system…**.
- Assert dialog title **Move to another system**, helper **Schedules and chores stay with this part.**, search **Search systems**.
- Confirm → **Move**; URL stays `/assets/:sourceId`; part name leaves the list.
- `GET /api/systems` proves registry reparent.

## Gotchas

- Menu item is disabled when only one system exists (`No other systems to move to.`).
- Schedules/tasks hang on `componentId` — no reparent required.
- Primary entry is the system page part row; ComponentDetail ⋯ remains for calendar deep-links.
- Drive logs in via `POST /api/auth/login` before seeding so `page.request` carries the session cookie.
