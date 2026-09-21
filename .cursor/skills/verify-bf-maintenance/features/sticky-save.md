# Sticky save on forms

Long forms keep Cancel/Save in a sticky bar above the fixed bottom tab nav so actions stay reachable while scrolling.

## Sub-features

- `sticky-add-system` on `/assets/new`.
- `sticky-schedule` on component schedule create form (`ScheduleForm` + `StickySaveBar`).
- `sticky-geometry` Save control’s bottom edge stays above the tab `nav`.

## How to get to it (user POV)

- Bottom nav → Add (`/assets/new`).
- Open a component → Add schedule.

## Driving it with Playwright

Preconditions:

- Unlocked; doctor green.
- Prefer read-only geometry check (do not save junk on live).

- **Open add system.** Run `node scripts/drive.mjs --feature sticky-save --base-url <url>`. Page heading `getByRole('heading', { level: 2, name: 'Add system' })`; buttons `Cancel` and `Save` visible in the sticky bar.
- **Measure.** Compare Save `boundingBox()` to the bottom `nav` box — Save’s bottom must be above nav’s top. Capture `sticky-save.png`.
- **Proof.** Geometry assertion in drive output + screenshot showing Save above the tab bar.

## Gotchas

- Bottom nav is `fixed`; main padding and StickySaveBar offset must clear it — regressions show Save under the tab bar.
- No meaningful curl equivalent; skip in API-only smoke.
