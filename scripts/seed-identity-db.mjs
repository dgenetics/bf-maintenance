#!/usr/bin/env node
/**
 * Create a minimal AiEA-shaped identity SQLite DB with one user.
 * Used by local/CI verify so BF can auth without a live AiEA Turso.
 *
 * Usage:
 *   node scripts/seed-identity-db.mjs <db-path> [email] [password] [name]
 */
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

const dbPath = process.argv[2];
const email = (process.argv[3] || process.env.BF_AUTH_EMAIL || "verify@beausoleil.test")
  .toLowerCase()
  .trim();
const password =
  process.argv[4] || process.env.BF_AUTH_PASSWORD || "verify-pass-1234";
const name = process.argv[5] || process.env.BF_AUTH_NAME || "Verify User";

if (!dbPath) {
  console.error("usage: seed-identity-db.mjs <db-path> [email] [password] [name]");
  process.exit(2);
}

mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
const url = dbPath.startsWith("file:")
  ? dbPath
  : `file:${path.resolve(dbPath)}`;

const db = createClient({ url });
const id = () => `c${randomBytes(12).toString("hex")}`;
const now = new Date().toISOString();

await db.executeMultiple(`
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "Workspace"("slug");
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'OWNER',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Area" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "icon" TEXT NOT NULL DEFAULT 'circle',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const existing = await db.execute({
  sql: `SELECT id FROM User WHERE email = ?`,
  args: [email],
});
if (existing.rows.length === 0) {
  const userId = id();
  const workspaceId = id();
  const hash = await bcrypt.hash(password, 10);
  await db.batch(
    [
      {
        sql: `INSERT INTO User (id, email, name, passwordHash, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [userId, email, name, hash, now, now],
      },
      {
        sql: `INSERT INTO Workspace (id, name, slug, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?)`,
        args: [workspaceId, `${name}'s Life`, `verify-${userId.slice(-6)}`, now, now],
      },
      {
        sql: `INSERT INTO WorkspaceMember (id, workspaceId, userId, role, createdAt)
              VALUES (?, ?, ?, 'OWNER', ?)`,
        args: [id(), workspaceId, userId, now],
      },
      {
        sql: `INSERT INTO Area (id, workspaceId, name, slug, color, icon, sortOrder, createdAt)
              VALUES (?, ?, 'Work', 'work', '#6366f1', 'briefcase', 0, ?)`,
        args: [id(), workspaceId, now],
      },
      {
        sql: `INSERT INTO Area (id, workspaceId, name, slug, color, icon, sortOrder, createdAt)
              VALUES (?, ?, 'Life', 'life', '#f59e0b', 'heart', 1, ?)`,
        args: [id(), workspaceId, now],
      },
    ],
    "write",
  );
  console.log(`seeded ${email} into ${url}`);
} else {
  console.log(`user ${email} already present in ${url}`);
}
