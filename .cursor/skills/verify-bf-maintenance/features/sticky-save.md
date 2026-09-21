# Sticky save on forms

## Sub-features
- Save/Cancel remain above the fixed bottom tab bar on long forms

## How to get to it (user POV)
Add system (`/assets/new`), edit system, or schedule form on a component.

## Driving it with browser
Visual: scroll the form; sticky save bar sits above bottom nav (`StickySaveBar`). No curl equivalent — skip in API smoke; require browser when changing Layout/StickySaveBar.

## Gotchas
- Bottom nav is `fixed`; padding on main must clear sticky + nav.
