# BF Maintenance

Systems and components registry for **Beausoleil Farm** — house and property.

Systems and components are stored in a **permanent database** (SQLite locally, Turso in production).

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

1. Create a free Turso database and token.
2. Set on Vercel (Production):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. Push schema:

```bash
vercel env pull .env.vercel --environment=production --yes
node --env-file=.env.vercel scripts/push-turso-schema.mjs
```

4. Deploy: `vercel --prod`

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
