# Sticky save on forms

Long forms keep Cancel/Save reachable. **Add system** opens as a vertically centered modal with Cancel/Save in the modal footer (always visible while the dialog is open). **Schedule forms** use `embedActions` (inline Save/Cancel) inside the same centered modal pattern.

## Sub-features

- `sticky-add-system` opens Add system modal from the header CTA (or `/?add=1` / `/assets/new` redirect).
- `sticky-geometry` Save control’s bottom edge stays above the tab `nav` while the modal is open.
- ~~`sticky-schedule`~~ — schedule create uses inline `embedActions`; do not assert StickySaveBar there.

## How to get to it (user POV)

- Systems → header **Add system** (centered modal).
- (Schedules: Add schedule uses inline Save/Cancel in its modal.)

## Driving it with Playwright

Preconditions:

- Unlocked; doctor green.
- Prefer read-only geometry check (do not save junk on live).

- **Open add system.** Run `node scripts/drive.mjs --feature sticky-save --base-url <url>`. Click banner button `Add system`; dialog `Add system` with h2 + Cancel/Save. Capture `sticky-save.png`.
- **Measure.** Compare Save `boundingBox()` to the bottom `nav` box — Save’s bottom must be above nav’s top.
- **Proof.** Geometry assertion in drive output + screenshot showing Save above the tab bar.

## Gotchas

- Bottom nav is `fixed`; modal footer actions must clear it — regressions show Save under the tab bar.
- Do not drive schedule-form sticky geometry; those actions are inline via `embedActions`.
- No meaningful curl equivalent; skip in API-only smoke.
