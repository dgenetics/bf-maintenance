import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { IdentityUser } from "@/lib/aiea-identity";

export const SESSION_COOKIE = "bf_session";
// Persistent until explicit Sign out — no idle timeout.
const SESSION_DAYS = 365;
const MAX_AGE_SEC = 60 * 60 * 24 * SESSION_DAYS;
const SESSION_VERSION = "v2";

export type SessionUser = IdentityUser;

function sessionSecret(): string {
  const secret = process.env.BF_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("BF_SESSION_SECRET is not configured");
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

function encodeSession(user: SessionUser, expMs: number): string {
  const body = Buffer.from(
    JSON.stringify({
      v: SESSION_VERSION,
      id: user.id,
      email: user.email,
      name: user.name,
      exp: expMs,
    }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionUser | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as {
      v?: string;
      id?: string;
      email?: string;
      name?: string;
      exp?: number;
    };
    if (payload.v !== SESSION_VERSION) return null;
    if (!payload.id || !payload.email || !payload.name || !payload.exp) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return { id: payload.id, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return decodeSession(token);
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionUser()) !== null;
}

export function setSessionCookie(res: NextResponse, user: SessionUser): void {
  const expMs = Date.now() + MAX_AGE_SEC * 1000;
  res.cookies.set(SESSION_COOKIE, encodeSession(user, expMs), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Returns 401 response if not authenticated; otherwise null. */
export async function requireAuth(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
