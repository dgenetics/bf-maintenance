# Account login

Account gate locks the farm maintenance UI until the shared AiEA email/password is accepted, rejects bad credentials, and stores an HTTP-only session cookie for later API/UI calls.

## Sub-features

- `auth-locked` shows Sign in when unauthenticated.
- `auth-reject` shows Invalid email or password and stays locked on bad values.
- `auth-unlock` accepts configured credentials and lands on Systems.
- `auth-session` keeps `/api/auth/me` authenticated after unlock.

## How to get to it (user POV)

- Open the app root (`/` or the Vercel URL) in a logged-out browser.
- After logout / cleared cookies, any deep link also redirects through the gate.

## Driving it with Playwright

Preconditions:

- `doctor.sh` green for the target base URL.
- `AIEA_SMOKE_EMAIL` / `AIEA_SMOKE_PASSWORD` match a User row in the AiEA identity DB.
- Fresh browser context (no prior `bf_session`).

- **See lock screen.** Open `/`. Run `node scripts/drive.mjs --feature account-login --base-url <url>`. Heading `getByRole('heading', { level: 1, name: 'Sign in' })` and Email/Password fields appear; capture `account-login-locked.png`.
- **Reject wrong password.** Fill Email/Password with bad values, click `Sign in`. Status `Invalid email or password` appears; still locked. Capture `account-login-wrong.png`.
- **Unlock.** Fill with `$AIEA_SMOKE_EMAIL` / `$AIEA_SMOKE_PASSWORD`, click `Sign in`. Page heading `getByRole('heading', { level: 2, name: 'Systems', exact: true })` and chrome `Beausoleil Farm` appear. Capture `account-login-unlocked.png` + aria JSON.
- **Proof.** Artifacts show locked → error → Systems. Optional: `GET /api/auth/me` with the session cookie returns authenticated (doctor already covers this).

## Gotchas

- Use the **smoke user** secrets (`AIEA_SMOKE_EMAIL` / `AIEA_SMOKE_PASSWORD`). Never Will’s (or any personal) account.

- Identity DB must be configured (`AIEA_DATABASE_URL` or `AIEA_TURSO_*`) and contain the verify user.
- Vercel Deployment Protection (SSO) can sit in front of the app auth on Preview.
- SPA may briefly show `Checking access…` before the gate; wait for `Email`, not a fixed sleep alone.
- Alias feature name `pin-gate` still routes to this driver for older scripts.
