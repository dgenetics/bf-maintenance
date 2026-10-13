/**
 * Interim session verifier (sso-design step 2).
 * Reads AiEA's aiea_session by calling GET {AIEA_URL}/api/session.
 * Does not read or write Session rows. Never logs the token.
 */

export const AIEA_SESSION_COOKIE = "aiea_session";
const CACHE_TTL_MS = 45_000;
const TOKEN_RE = /^[0-9a-fA-F]+$/;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export class SessionUnavailableError extends Error {
  readonly status = 503;
  constructor() {
    super("Can't verify sign-in");
    this.name = "SessionUnavailableError";
  }
}

export type ParsedSession =
  | { kind: "ok"; user: SessionUser; expiresAtMs: number }
  | { kind: "signed-out" }
  | { kind: "unavailable" };

type CacheHit = {
  user: SessionUser;
  expiresAtMs: number;
  cachedAt: number;
};

function cache(): Map<string, CacheHit> {
  const g = globalThis as typeof globalThis & {
    __bfAieaSessionCache?: Map<string, CacheHit>;
  };
  if (!g.__bfAieaSessionCache) g.__bfAieaSessionCache = new Map();
  return g.__bfAieaSessionCache;
}

export function aieaOrigin(): string | null {
  const raw =
    process.env.AIEA_URL?.trim() || process.env.AIEA_BASE_URL?.trim() || "";
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function parseExpires(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/** Classify a GET /api/session JSON body. `now` is injected for tests. */
export function parseSessionBody(body: unknown, now: number): ParsedSession {
  if (!body || typeof body !== "object") return { kind: "unavailable" };
  const record = body as {
    user?: { id?: unknown; email?: unknown; name?: unknown };
    expiresAt?: unknown;
  };
  const user = record.user;
  if (!user || typeof user !== "object") return { kind: "unavailable" };
  const id = typeof user.id === "string" ? user.id : "";
  const email = typeof user.email === "string" ? user.email : "";
  const name = typeof user.name === "string" ? user.name : "";
  if (!id || !email || !name) return { kind: "unavailable" };
  const expiresAtMs = parseExpires(record.expiresAt);
  if (expiresAtMs === null) return { kind: "unavailable" };
  if (expiresAtMs <= now) return { kind: "signed-out" };
  return { kind: "ok", user: { id, email, name }, expiresAtMs };
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify the raw aiea_session token.
 * Returns null when the user is signed out (missing, rejected, or expired).
 * Throws SessionUnavailableError when AiEA cannot be asked.
 */
export async function verifyAieaSession(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null;
  if (!TOKEN_RE.test(token)) return null;

  const hash = await sha256Hex(token);
  const now = Date.now();
  const store = cache();
  const hit = store.get(hash);
  if (hit && now - hit.cachedAt < CACHE_TTL_MS && hit.expiresAtMs > now) {
    return hit.user;
  }
  store.delete(hash);

  const origin = aieaOrigin();
  if (!origin) throw new SessionUnavailableError();

  const headers: Record<string, string> = {
    cookie: `${AIEA_SESSION_COOKIE}=${token}`,
    accept: "application/json",
  };
  const bypass = process.env.AIEA_PROTECTION_BYPASS?.trim();
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;

  let res: Response;
  try {
    res = await fetch(`${origin}/api/session`, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    throw new SessionUnavailableError();
  }

  if (res.status === 401 || res.status === 403) return null;
  if (res.status < 200 || res.status >= 300) throw new SessionUnavailableError();

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new SessionUnavailableError();
  }

  const parsed = parseSessionBody(body, Date.now());
  if (parsed.kind === "unavailable") throw new SessionUnavailableError();
  if (parsed.kind === "signed-out") return null;

  if (store.size > 500) store.clear();
  store.set(hash, {
    user: parsed.user,
    expiresAtMs: parsed.expiresAtMs,
    cachedAt: Date.now(),
  });
  return parsed.user;
}
