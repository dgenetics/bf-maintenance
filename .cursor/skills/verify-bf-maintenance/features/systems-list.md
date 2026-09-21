# Systems list + search

## Sub-features
- List systems/assets
- Client search synced to `?q=`
- Honest `n of total` when filtered
- Hide empty Replace chrome when no replacement total

## How to get to it (user POV)
After unlock, land on `/` (systems). Type in search; URL gains `?q=`.

## Driving it with curl / browser
API: `GET /api/systems` with session cookie — non-empty JSON array or `[]`.
UI proof: set `?q=` to a known system name substring; visible count matches filtered rows; empty Replace not shown as `Replace —`.

## Gotchas
- Search is client-side over loaded assets; API may still return full list.
