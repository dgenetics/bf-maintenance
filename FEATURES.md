# BF Maintenance — feature map

Registry and chore list for **Beausoleil Farm** (house, farm, equipment). Systems and parts live here; maintenance schedules become tasks the user completes in this app, and AiEA can import and sync those tasks. UI is a React Router SPA on a Next.js catch-all (`src/app/[[...slug]]/page.tsx`, `src/App.tsx`).

## Pages

Shell (`src/components/Layout.tsx`): header “Maintenance”, bottom nav **Systems** / **Chores** / **Schedules**, overflow **Sign out**. Header **Add system** on `/`, **Add schedule** on `/schedules` (sets `?add=1`). Unknown paths redirect to `/`.

| Path | What the user can do |
|------|----------------------|
| Sign-in gate (no route) | Sign in, or **Get started** to register. Shown until `GET /api/auth/me` succeeds (`src/components/AuthGate.tsx`, `src/App.tsx`). |
| `/` | Search systems and parts (`?q=`). List grouped by category, with part count and replacement total. **Add system** (`?add=1` or `/assets/new`) opens a modal (name, category, notes) and then opens the new system (`src/views/AssetList.tsx`). |
| `/assets/:id` | View purchase and replacement totals (sums of parts). Edit system name, category, notes (sticky save). Add, expand-edit, duplicate, delete, and move parts. Part row calendar opens **Add schedule** for that part. `?part=` expands a part. Delete system (`src/views/AssetDetail.tsx`, `src/components/ComponentsList.tsx`). |
| `/assets/:systemId/components/:componentId` | Part page: list and delete schedules, add a schedule (also materializes its task), complete or cancel open tasks, see recent completions, move the part. No in-app link opens this URL except after a move from this page; Schedules → **View component** goes to `/assets/:id?part=` (`src/views/ComponentDetail.tsx`, `src/views/Schedules.tsx`). |
| `/maintenance` | **Chores.** On load and **Refresh**, materializes missing open tasks, then buckets open work **Overdue** / **Due soon** (due within 7 days) / **Upcoming** by due date. Complete or cancel a task. Reopen from the recent-completed strip (up to 8). Link to the archive (`src/views/Maintenance.tsx`). |
| `/maintenance/archive` | **Completed archive.** Filter by system, component, and completed-from / completed-to (`?system=&component=&from=&to=`). Reopen a task (`src/views/MaintenanceArchive.tsx`). |
| `/schedules` | All schedules. Search (`?q=`) and filter by system. Add (pick a part, recent picks in `localStorage`), edit, delete. Urgency chip from `nextDueDate`. Creating here does not materialize a task until Chores loads (`src/views/Schedules.tsx`). |

`/assets` redirects to `/`. There is no manual “add task” screen; `POST /api/tasks` exists but the UI never calls it (`src/lib/api.ts`).

## Data

App data is Prisma on SQLite (`prisma/schema.prisma`). Local: `DATABASE_URL` file via better-sqlite3 (default `file:./dev.db`). Production: Turso libSQL when `TURSO_DATABASE_URL` is set (`src/lib/db.ts`). This database is separate from AiEA’s. Ids are `cuid()`. Deleting a system cascades to components; deleting a component cascades to its schedules and tasks. Deleting a schedule sets task `scheduleId` to null.

**System** (`System`; UI type `Asset` in `src/types.ts`): `name`, `category` (default `Other`), `notes`, `createdAt`, `updatedAt`. Categories: HVAC, Culinary, Laundry, Water, Electrical, Plumbing, Farm Equipment, Vehicles, Security, Structures, Other. Legacy `Appliance` → Culinary, `Outdoor` → Farm Equipment (`normalizeCategory`).

**Component** (a part): `systemId`, `name`, `location`, `modelNumber`, `productNumber`, `serialNumber`, `manufacturer`, `warrantyInfo`, `userManual`, `vendorName`, `vendorContact`, `serviceCompanyName`, `serviceCompanyContact`, `purchaseDate`, `purchaseCost`, `replacementCost`, `notes`, `sortOrder`. Duplicate copies fields and clears `serialNumber` (`src/app/api/systems/[id]/components/[componentId]/duplicate/route.ts`). Move is a `systemId` patch.

**Schedule** (`MaintenanceSchedule`): `componentId`, `name`, `description`, `frequency`, `intervalDays`, `isRecurring` (default true), `nextDueDate`, `lastCompletedAt`, timestamps. UI frequencies: `7d`, `14d`, `30d`, `90d`, `6mo` (182 days), `1y` (365), or custom days (`src/lib/maintenance.ts`, `src/components/maintenance/ScheduleForm.tsx`).

**Task** (`MaintenanceTask`): `scheduleId` (optional), `componentId`, `title`, `description`, `dueDate`, `status`, `completedAt`, `completedNotes`, timestamps. Status enum: `PENDING`, `DUE_SOON`, `OVERDUE`, `COMPLETED`, `CANCELLED`. Open status is derived from the due date (UTC day): overdue if before today, `DUE_SOON` if within 7 days, else `PENDING` (`statusForDueDate`). Chores buckets use that same rule even if the stored status is stale (`partitionTasksByDueDate`).

There is no BF user table.

## Schedules → tasks, and AiEA

Materialize (`GET /api/tasks/suggest`, `src/app/api/tasks/suggest/route.ts`) is idempotent: for each schedule with no open task, create one titled with the schedule name, due on `nextDueDate`, status from the due date. It also refreshes open statuses. Triggers:

- Chores load / Refresh: `?all=1` (every component that has a schedule).
- Add schedule on a system part row or on the component page: `?componentId=` for that part.
- AiEA pull: `GET /api/integrations/suggestions` (same create rule, all components).

The Schedules tab does not materialize on create.

**Complete** (`src/lib/complete-task.ts`): mark `COMPLETED`, store notes. If the schedule is recurring and has an interval, set `lastCompletedAt` to now, `nextDueDate` to now + interval days, and create the next open task if none is open. Otherwise only set `lastCompletedAt`.

**Reopen** (`src/lib/reopen-task.ts`): set an open status from the due date and clear completion fields. If the task was `COMPLETED` on a schedule, rewind that schedule (`nextDueDate` = this task’s due date; `lastCompletedAt` = the latest remaining completion, or null) and delete an untouched auto-spawned next task (no `completedAt`, `updatedAt` within 2s of `createdAt`). Reopening a `CANCELLED` task does not rewind the schedule. Cancel (`status: CANCELLED`) does not call AiEA.

AiEA link key is `bf-task:<MaintenanceTask.id>`. BF does not store an AiEA id. AiEA pulls suggestions (`externalId`, title, description, `dueAt`, priority 1/2/3, system/component/schedule fields) from `GET /api/integrations/suggestions`. BF pushes only complete/reopen:

- BF complete → `POST {AIEA_URL}/api/integrations/bf-maintenance/complete` with `{ bfTaskId }` (`src/lib/aiea-client.ts`).
- BF reopen → `POST …/bf-maintenance/reopen` with `{ bfTaskId }`.
- AiEA complete → `POST /api/integrations/tasks/complete` `{ taskId, completedNotes? }`, then BF best-effort notifies AiEA again.
- AiEA reopen → `POST /api/integrations/tasks/reopen` `{ taskId }`. No callback to AiEA.

Outbound calls need `AIEA_URL` or `AIEA_BASE_URL`, plus `BF_INTEGRATION_SECRET` (Bearer). If either is missing, sync is skipped. If it fails, the BF write stays and the UI shows “Couldn't sync to AiEA — try again.” An AiEA 404 whose body matches “task not found” is treated as success (unlinked chore). Optional header `x-vercel-protection-bypass` from `AIEA_PROTECTION_BYPASS`.

## Auth

The sign-in screen says “Use the same email and password as AiEA.” Register says “Creates your shared AiEA account.” That is a shared **identity database**, not a shared session.

Login and register talk to AiEA’s `User` table through libSQL (`src/lib/aiea-identity.ts`): `AIEA_TURSO_DATABASE_URL` + `AIEA_TURSO_AUTH_TOKEN`, or else `AIEA_DATABASE_URL` (relative `file:` paths resolve from the process cwd). Login loads `User` by lowercased email and checks `passwordHash` with bcrypt. Register inserts the same rows AiEA’s register path writes: `User` (bcrypt cost 10), a `Workspace` named “{first name}'s Life”, a `WorkspaceMember` with role `OWNER`, and Work / Life `Area` rows. Email must be unique. Password length on register is 8–100.

After that, BF issues its **own** cookie `bf_session` (`src/lib/auth.ts`). Payload version `v2` is `{ id, email, name, exp }`, HMAC-SHA256 with `BF_SESSION_SECRET`, 365 days, no idle timeout. Cookie: `httpOnly`, `sameSite=lax`, `path=/`, `secure` when `NODE_ENV=production`. Each request checks the signature and expiry only; it does not re-read the AiEA user. Sign out is `POST /api/auth/logout`. App APIs use this cookie (`requireAuth`). A 401 from the maintenance client sends the browser to `/` (`src/lib/api.ts`).

## HTTP API

Session cookie (401 if missing), except auth and the integration routes:

| Method | Path |
|--------|------|
| POST | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` |
| GET | `/api/auth/me` |
| GET, POST | `/api/systems` |
| GET, PATCH, DELETE | `/api/systems/:id` |
| POST | `/api/systems/:id/components` |
| PATCH, DELETE | `/api/systems/:id/components/:componentId` (PATCH may set `systemId` to move) |
| POST | `…/components/:componentId/duplicate` |
| GET, POST | `/api/schedules` (`?componentId=`) |
| GET, PATCH, DELETE | `/api/schedules/:id` |
| GET, POST | `/api/tasks` (`?status=&componentId=&scheduleId=&open=1`) |
| GET, PATCH, DELETE | `/api/tasks/:id` (complete: `{ status: "COMPLETED" }`; reopen: `{ status: "PENDING", reopen: true }`) |
| GET | `/api/tasks/suggest?componentId=` or `?all=1` |

Integration routes use `Authorization: Bearer <BF_INTEGRATION_SECRET>` or `X-BF-Integration-Key` (`src/lib/integration-auth.ts`), not the session cookie. 503 if the secret is unset.

| Method | Path |
|--------|------|
| GET | `/api/integrations/suggestions` |
| POST | `/api/integrations/tasks/complete` |
| POST | `/api/integrations/tasks/reopen` |

## Background work

No cron and no worker. `vercel.json` has no `crons`. Tasks are created and statuses refreshed only when Chores loads, a part schedule is saved, a recurring task is completed, or AiEA calls suggestions. `scripts/push-turso-schema.mjs` and `scripts/check-reopen.ts` are manual.

## Deploy

Vercel (`vercel.json`: Next.js, region `iad1`). The in-app error copy points at `https://bf-maintenance.vercel.app` (`src/App.tsx`). Production data is the project’s own Turso database (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`).

`next.config.ts` sets neither `basePath` nor `assetPrefix`. The client router has no basename, and fetches use root paths (`/api/...`). The app is planned to be served under `/maintenance` on the combined Farm Manager site (AiEA PR #12). That prefix is not implemented in this repo.

## Environment variables

Names only.

Runtime: `DATABASE_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BF_SESSION_SECRET`, `AIEA_DATABASE_URL`, `AIEA_TURSO_DATABASE_URL`, `AIEA_TURSO_AUTH_TOKEN`, `BF_INTEGRATION_SECRET`, `AIEA_URL`, `AIEA_BASE_URL`, `AIEA_PROTECTION_BYPASS`, `NODE_ENV`.

Verify / CI / scripts (not required for the app): `AIEA_SMOKE_EMAIL`, `AIEA_SMOKE_PASSWORD`, `BF_AUTH_EMAIL`, `BF_AUTH_PASSWORD`, `BF_AUTH_NAME`, `VERIFY_BASE_URL`, `SMOKE_BASE_URL`, `VERIFY_RUN_ID`, `PLAYWRIGHT_CHROME_PATH`.
