# Pin gate

Pin gate locks the farm maintenance UI until the shared access PIN is accepted, rejects wrong pins, and stores an HTTP-only session cookie for later API/UI calls.

## Sub-features

- `pin-locked` shows Maintenance access with PIN field when unauthenticated.
- `pin-reject` shows Incorrect PIN and stays locked on a bad value.
- `pin-unlock` accepts the configured PIN and lands on Systems.
- `pin-session` keeps `/api/auth/me` authenticated after unlock.

## How to get to it (user POV)

- Open the app root (`/` or the Vercel URL) in a logged-out browser.
- After logout / cleared cookies, any deep link also redirects through the gate.

## Driving it with Playwright

Preconditions:

- `doctor.sh` green for the target base URL.
- `BF_ACCESS_PIN` matches the instance.
- Fresh browser context (no prior `bf_session`).

- **See lock screen.** Open `/`. Run `node scripts/drive.mjs --feature pin-gate --base-url <url>`. Heading `Maintenance access` and textbox `Access PIN` appear; capture `pin-gate-locked.png`.
- **Reject wrong PIN.** Fill `Access PIN` with `__wrong__`, click `Unlock`. Status `Incorrect PIN` appears; still locked. Capture `pin-gate-wrong.png`.
- **Unlock.** Fill `Access PIN` with `$BF_ACCESS_PIN`, click `Unlock`. Heading `Systems` and chrome `Beausoleil Farm` appear. Capture `pin-gate-unlocked.png` + aria JSON.
- **Proof.** Artifacts show locked → error → Systems. Optional: `GET /api/auth/me` with the session cookie returns authenticated (doctor already covers this).

## Gotchas

- Placeholder / wrong env PIN fails unlock even when the UI is healthy — check `BF_ACCESS_PIN` against the deployment.
- Vercel Deployment Protection (SSO) can sit in front of the app PIN on Preview; production `bf-maintenance.vercel.app` uses the app PIN only.
- SPA may briefly show `Checking access…` before the gate; wait for `Access PIN`, not a fixed sleep alone.
