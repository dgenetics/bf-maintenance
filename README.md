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
| `BF_ACCESS_PIN` | App unlock PIN |
| `BF_SESSION_SECRET` | Session HMAC secret |

Do **not** reuse AiEA’s `TURSO_*` values.

```bash
vercel env pull .env.vercel --environment=production --yes
node --env-file=.env.vercel scripts/push-turso-schema.mjs   # schema only if needed
vercel --prod
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/systems` | List / create systems |
| GET/PATCH/DELETE | `/api/systems/:id` | System CRUD |
| POST | `/api/systems/:id/components` | Add component |
| PATCH/DELETE | `/api/systems/:id/components/:cid` | Component update/delete |
| POST | `.../components/:cid/duplicate` | Duplicate component |

---

*Built for Beausoleil Farm, Middletown MD.*
