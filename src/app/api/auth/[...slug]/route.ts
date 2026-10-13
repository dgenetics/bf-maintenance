import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Login, register, and logout live on AiEA. This app only keeps GET /api/auth/me. */
function gone() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function GET() {
  return gone();
}

export function POST() {
  return gone();
}

export function PUT() {
  return gone();
}

export function PATCH() {
  return gone();
}

export function DELETE() {
  return gone();
}
