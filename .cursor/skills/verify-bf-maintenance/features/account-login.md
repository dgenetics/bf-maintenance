# Account login

Signed-out visits to maintenance redirect to AiEA's login with `next` set to the original `/maintenance/...` path. A correct AiEA password comes back to that path with no second login. The Farm Manager bar shows Account. Sign out clears the shared session and lands on `/login`.

## Sub-features

- `auth-locked` sends `/maintenance/schedules` to `/login?next=/maintenance/schedules`.
- `auth-reject` shows Invalid email or password and stays signed out.
- `auth-unlock` accepts the smoke user and returns to Schedules with Account in the bar.
- `auth-sign-out` posts to AiEA logout and lands on `/login`.

## How to get to it (user POV)

- Open `/maintenance/schedules` in a logged-out browser.
- After sign-out, the address bar is AiEA's `/login`.

## Driving it with Playwright

Preconditions:

- `doctor.sh` green for the target base URL.
- `AIEA_SMOKE_EMAIL` / `AIEA_SMOKE_PASSWORD` match the AiEA user (local stand-in or real AiEA).
- Fresh browser context (no prior `aiea_session`).

- **See the redirect.** Open `/maintenance/schedules`. Run `node scripts/drive.mjs --feature account-login --base-url <url>`. The URL contains `/login?next=` and `/maintenance/schedules`. Heading `getByRole('heading', { level: 1, name: 'Sign in' })`. Capture `account-login-locked.png`.
- **Reject wrong password.** Fill Email/Password with bad values, click `Sign in`. Status `Invalid email or password` appears. Capture `account-login-wrong.png`.
- **Unlock.** Fill with `$AIEA_SMOKE_EMAIL` / `$AIEA_SMOKE_PASSWORD`, click `Sign in`. Page heading `getByRole('heading', { level: 2, name: 'Schedules', exact: true })`, chrome `Beausoleil Farm`, and Farm Manager link `Account`. No email field on the maintenance page. Capture `account-login-unlocked.png`.
- **Sign out.** Header `More` → `Sign out`. Heading Sign in and a `/login` URL. Capture `account-login-signed-out.png`.

## Gotchas

- Use the **smoke user** secrets (`AIEA_SMOKE_EMAIL` / `AIEA_SMOKE_PASSWORD`). Never Will’s (or any personal) account.
- Local `--local` serves login and `GET /api/session` from the verify stand-in on the same origin. Production login and `GET /api/session` are AiEA's, and this app only works once that endpoint is deployed.
- Vercel Deployment Protection (SSO) can sit in front of preview deploys.
- The maintenance page may briefly show `Checking access…` after login; wait for the Schedules heading.
- Alias feature name `pin-gate` still routes to this driver for older scripts.
