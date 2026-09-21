# Systems list + search

Systems list shows farm assets after unlock, filters client-side via search synced to `?q=`, and reports an honest `n of total` subtitle when filtered.

## Sub-features

- `systems-list` renders the Systems heading and cards (or empty state).
- `systems-search-url` writes the query into `?q=` (replace navigation).
- `systems-search-empty` shows No matches for a nonsense query.
- `systems-count` shows `n of total systems` while filtering.

## How to get to it (user POV)

- Unlock, land on `/` (Systems tab).
- Bottom nav → Systems.
- Type in Search systems; URL gains `?q=`.

## Driving it with Playwright

Preconditions:

- Unlocked session (drive unlocks if locked).
- Instance has zero or more systems (live typically has many).

- **Open list.** Run `node scripts/drive.mjs --feature systems-list --base-url <url>`. Heading `Systems` visible.
- **Empty search.** Fill `Search systems` with `xyzzy-no-match-verify`. URL contains `q=`; UI shows No matches / `0 of N`. Capture `systems-search-empty.png`.
- **Filtered count.** Clear and type a letter that matches something (e.g. `a`). Subtitle matches `N of M systems` when filtered. Capture `systems-search-filtered.png`.
- **Proof.** Screenshots + URL query string; do not assert API filter (search is client-side over loaded assets).

## Gotchas

- `GET /api/systems` still returns the full list; filtering is UI-only.
- Category select (`Filter by category`) also affects the subtitle — reset to All categories when proving search alone.
