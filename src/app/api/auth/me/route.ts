import { NextResponse } from "next/server";
import { getSessionUser, SessionUnavailableError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user });
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
