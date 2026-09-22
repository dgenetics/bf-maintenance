# Sticky save on forms

Long forms keep Cancel/Save reachable while scrolling. **Add system** (`/assets/new`) still uses `StickySaveBar` above the fixed bottom tab nav. **Schedule forms** now use `embedActions` (inline Save/Cancel next to the form) — not the sticky bar — so schedule sticky geometry is out of scope for this driver.

## Sub-features

- `sticky-add-system` on `/assets/new` (StickySaveBar).
- `sticky-geometry` Save control’s bottom edge stays above the tab `nav` on Add system.
- ~~`sticky-schedule`~~ — schedule create uses inline `embedActions`; do not assert StickySaveBar there.

## How to get to it (user POV)

- Bottom nav → Add (`/assets/new`).
- (Schedules: Add schedule uses inline Save/Cancel, not sticky.)

## Driving it with Playwright

Preconditions:

- Unlocked; doctor green.
- Prefer read-only geometry check (do not save junk on live).

- **Open add system.** Run `node scripts/drive.mjs --feature sticky-save --base-url <url>`. Page heading `getByRole('heading', { level: 2, name: 'Add system' })`; buttons `Cancel` and `Save` visible in the sticky bar.
- **Measure.** Compare Save `boundingBox()` to the bottom `nav` box — Save’s bottom must be above nav’s top. Capture `sticky-save.png`.
- **Proof.** Geometry assertion in drive output + screenshot showing Save above the tab bar.

## Gotchas

- Bottom nav is `fixed`; main padding and StickySaveBar offset must clear it — regressions show Save under the tab bar.
- Do not drive schedule-form sticky geometry; those actions are inline via `embedActions`.
- No meaningful curl equivalent; skip in API-only smoke.
