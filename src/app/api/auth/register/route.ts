import { NextResponse } from "next/server";
import { z } from "zod";
import {
  identityConfigured,
  registerIdentityUser,
} from "@/lib/aiea-identity";
import { setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  if (!identityConfigured()) {
    return NextResponse.json(
      { error: "Account login is not configured on the server" },
      { status: 503 },
    );
  }
  if (!process.env.BF_SESSION_SECRET?.trim()) {
    return NextResponse.json(
      { error: "BF_SESSION_SECRET is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = schema.parse(await req.json());
    const result = await registerIdentityUser(body);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    const res = NextResponse.json({
      ok: true,
      user: result.user,
    });
    setSessionCookie(res, result.user);
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
