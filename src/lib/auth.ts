import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SessionUnavailableError,
  verifyAieaSession,
  type SessionUser,
} from "@/lib/aiea-session";

export type { SessionUser };
export { SessionUnavailableError };

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get("aiea_session")?.value;
  return verifyAieaSession(token);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionUser()) !== null;
}

/** 401 when signed out, 503 when AiEA's session check cannot be completed. */
export async function requireAuth(): Promise<NextResponse | null> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  } catch (err) {
    if (!(err instanceof SessionUnavailableError)) {
      console.error("session verify failed");
    }
    return NextResponse.json(
      { error: "Can't verify sign-in" },
      { status: 503 },
    );
  }
}
