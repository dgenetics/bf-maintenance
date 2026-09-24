# BF Maintenance

Systems and components registry for **Beausoleil Farm** — house and property.

Systems and components are stored in a **permanent database** (SQLite locally, dedicated Turso in production).

> **Database ownership:** BF Maintenance owns its own Turso database (`bf-maintenance-db`). It must **not** share AiEA’s Turso instance. Local: `file:./dev.db`. Production: Vercel Marketplace Turso resource connected to this project only.

## System fields

Name, category, notes, and a list of **components**.

## Component fields

Name, location, manufacturer, model/SKU/serial, warranty, user manual, vendor/installer, maintenance company, purchase date, purchase cost, replacement cost, notes.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Prisma 7
- SQLite (local) / **Turso** libSQL (production)
- React Router (client UI)

## Develop

```bash
cd ~/Documents/SoftwareProjects/BF-Maintenance
cp .env.example .env   # DATABASE_URL=file:./dev.db
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

## Production database (Turso)

Provisioned via Vercel Marketplace as **`bf-maintenance-db`** (project-linked). Env vars:

| Var | Purpose |
|-----|---------|
| `TURSO_DATABASE_URL` | libSQL URL (from Marketplace resource) |
| `TURSO_AUTH_TOKEN` | DB token (from Marketplace resource) |
| `BF_SESSION_SECRET` | Session HMAC secret (required) |
| `AIEA_TURSO_DATABASE_URL` / `AIEA_TURSO_AUTH_TOKEN` | AiEA identity DB (same User table as AiEA) |
| `AIEA_DATABASE_URL` | Local/file identity DB (verify or shared AiEA sqlite) |

BF app data stays on BF’s own Turso (`TURSO_*`). Account login reads AiEA’s User rows via `AIEA_*` — do **not** point BF `TURSO_*` at AiEA.

```bash
vercel env pull .env.vercel --environment=production --yes
node --env-file=.env.vercel scripts/push-turso-schema.mjs   # schema only if needed
vercel --prod
```

## App routes (UI)

| Path | Screen |
|------|--------|
| `/` | Systems list |
| `/maintenance` | Maintenance dashboard (tasks by status) |
| `/assets/:id` | System detail + components |
| `/assets/:systemId/components/:componentId` | Component maintenance (schedules & tasks) |
| `/assets/new` | Add system |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/systems` | List / create systems |
| GET/PATCH/DELETE | `/api/systems/:id` | System CRUD |
| POST | `/api/systems/:id/components` | Add component |
| PATCH/DELETE | `/api/systems/:id/components/:cid` | Component update/delete |
| POST | `.../components/:cid/duplicate` | Duplicate component |
| GET/POST | `/api/schedules` | List / create schedules |
| GET/PATCH/DELETE | `/api/schedules/:id` | Schedule CRUD |
| GET/POST | `/api/tasks` | List / create tasks |
| GET/PATCH/DELETE | `/api/tasks/:id` | Task get / complete / cancel / delete |
| GET | `/api/tasks/suggest?componentId=` | Generate tasks from due schedules |


## CI (GitHub Actions)

Workflow source: `ci/verify.yml` (copy to `.github/workflows/verify.yml` to enable Actions — GitHub requires the `workflow` OAuth scope to push that path via API/CLI).

Once enabled, PRs and pushes to `main` run:

1. `npm ci` + `npm run typecheck` + `npm run build`
2. Local Next server via the verify skill `gate.sh --local`
3. Instance **doctor** + Playwright **account-login** drive

**Optional secrets:** `BF_AUTH_EMAIL` / `BF_AUTH_PASSWORD` / `BF_SESSION_SECRET` — local `--local` gate seeds a disposable AiEA-shaped identity DB with defaults when unset.

Evidence lands in the workflow artifact `verify-evidence-<run_id>`.

---

*Built for Beausoleil Farm, Middletown MD.*

## AiEA complete/reopen sync

Linked tasks use `externalId = bf-task:<MaintenanceTask.id>` on AiEA.

| Env | Purpose |
|-----|---------|
| `BF_INTEGRATION_SECRET` | Shared Bearer / X-BF-Integration-Key (inbound AiEA + outbound) |
| `AIEA_URL` (or `AIEA_BASE_URL`) | AiEA origin for BF→AiEA complete/reopen POSTs |

Outbound calls are best-effort (log + continue). Reopen restores open status from due date; **does not** rewind schedule `lastCompletedAt` / `nextDueDate`.

