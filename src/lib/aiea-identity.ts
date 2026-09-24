import { createClient, type Client } from "@libsql/client";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";

export type IdentityUser = {
  id: string;
  email: string;
  name: string;
};

type IdentityUserRow = IdentityUser & { passwordHash: string };

const globalForIdentity = globalThis as unknown as {
  aieaIdentity?: Client;
};

function resolveIdentityUrl(): { url: string; authToken?: string } {
  const tursoUrl = process.env.AIEA_TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.AIEA_TURSO_AUTH_TOKEN?.trim();
  if (tursoUrl) {
    return { url: tursoUrl, authToken: tursoToken };
  }

  const raw = process.env.AIEA_DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "AiEA identity DB is not configured (set AIEA_TURSO_DATABASE_URL or AIEA_DATABASE_URL)",
    );
  }

  if (raw.startsWith("file:")) {
    const filePath = raw.slice("file:".length);
    if (path.isAbsolute(filePath)) {
      return { url: raw };
    }
    return {
      url: `file:${path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath)}`,
    };
  }

  return { url: raw };
}

function getIdentityClient(): Client {
  if (!globalForIdentity.aieaIdentity) {
    const { url, authToken } = resolveIdentityUrl();
    globalForIdentity.aieaIdentity = createClient({ url, authToken });
  }
  return globalForIdentity.aieaIdentity;
}

function newId(): string {
  return `c${randomBytes(12).toString("hex")}`;
}

function slugify(name: string, userId: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace";
  return `${base}-${userId.slice(-6)}`;
}

export function identityConfigured(): boolean {
  return Boolean(
    process.env.AIEA_TURSO_DATABASE_URL?.trim() ||
      process.env.AIEA_DATABASE_URL?.trim(),
  );
}

export async function findIdentityUserByEmail(
  email: string,
): Promise<IdentityUserRow | null> {
  const db = getIdentityClient();
  const normalized = email.toLowerCase().trim();
  const result = await db.execute({
    sql: `SELECT id, email, name, passwordHash FROM User WHERE email = ? LIMIT 1`,
    args: [normalized],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    passwordHash: String(row.passwordHash),
  };
}

export async function verifyIdentityCredentials(
  email: string,
  password: string,
): Promise<IdentityUser | null> {
  const user = await findIdentityUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Create the same AiEA User (+ minimal workspace) the AiEA register route creates.
 * Writes to the shared AiEA identity database — no BF password table.
 */
export async function registerIdentityUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: IdentityUser } | { error: string; status: number }> {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();
  if (!name || name.length > 80) {
    return { error: "Invalid name", status: 400 };
  }
  if (!email || !email.includes("@")) {
    return { error: "Invalid email", status: 400 };
  }
  if (input.password.length < 8 || input.password.length > 100) {
    return { error: "Password must be 8–100 characters", status: 400 };
  }

  const existing = await findIdentityUserByEmail(email);
  if (existing) {
    return { error: "Email already registered", status: 409 };
  }

  const db = getIdentityClient();
  const userId = newId();
  const workspaceId = newId();
  const memberId = newId();
  const workAreaId = newId();
  const lifeAreaId = newId();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const workspaceName = `${name.split(" ")[0] || "My"}'s Life`;
  const slug = slugify(workspaceName, userId);

  await db.batch(
    [
      {
        sql: `INSERT INTO User (id, email, name, passwordHash, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [userId, email, name, passwordHash, now, now],
      },
      {
        sql: `INSERT INTO Workspace (id, name, slug, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?)`,
        args: [workspaceId, workspaceName, slug, now, now],
      },
      {
        sql: `INSERT INTO WorkspaceMember (id, workspaceId, userId, role, createdAt)
              VALUES (?, ?, ?, 'OWNER', ?)`,
        args: [memberId, workspaceId, userId, now],
      },
      {
        sql: `INSERT INTO Area (id, workspaceId, name, slug, color, icon, sortOrder, createdAt)
              VALUES (?, ?, 'Work', 'work', '#6366f1', 'briefcase', 0, ?)`,
        args: [workAreaId, workspaceId, now],
      },
      {
        sql: `INSERT INTO Area (id, workspaceId, name, slug, color, icon, sortOrder, createdAt)
              VALUES (?, ?, 'Life', 'life', '#f59e0b', 'heart', 1, ?)`,
        args: [lifeAreaId, workspaceId, now],
      },
    ],
    "write",
  );

  return { user: { id: userId, email, name } };
}

/** Deterministic fingerprint for diagnostics (never log raw secrets). */
export function identityConfigFingerprint(): string {
  try {
    const { url } = resolveIdentityUrl();
    return createHash("sha256").update(url).digest("hex").slice(0, 12);
  } catch {
    return "unconfigured";
  }
}
