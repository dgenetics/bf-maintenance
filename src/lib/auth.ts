import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "bf_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function getPin(): string {
  const pin = process.env.BF_ACCESS_PIN?.trim();
  if (!pin) {
    throw new Error("BF_ACCESS_PIN is not configured");
  }
  return pin;
}

function sessionSecret(): string {
  return (
    process.env.BF_SESSION_SECRET?.trim() ||
    process.env.BF_ACCESS_PIN?.trim() ||
    "dev-only-secret"
  );
}

/** Opaque session token derived from PIN + secret (not reversible to PIN). */
export function expectedSessionToken(): string {
  return createHmac("sha256", sessionSecret())
    .update(`bf-maintenance:v1:${getPin()}`)
    .digest("hex");
}

export function pinsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided.normalize("NFKC"));
  const b = Buffer.from(expected.normalize("NFKC"));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function tokensMatch(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPin(pin: string): boolean {
  try {
    return pinsMatch(pin.trim(), getPin());
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return false;
    return tokensMatch(token, expectedSessionToken());
  } catch {
    return false;
  }
}

export function setSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, expectedSessionToken(), {
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
