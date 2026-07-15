import { NextResponse } from "next/server";
import { setSessionCookie, verifyPin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.BF_ACCESS_PIN?.trim()) {
    return NextResponse.json(
      { error: "PIN is not configured on the server" },
      { status: 500 },
    );
  }

  let pin = "";
  try {
    const body = (await req.json()) as { pin?: string };
    pin = String(body.pin ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!verifyPin(pin)) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res);
  return res;
}
