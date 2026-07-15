import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mapSystem } from "@/lib/mappers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id } = await ctx.params;
  const db = getDb();
  const system = await db.system.findUnique({
    where: { id },
    include: { components: true },
  });
  if (!system) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(mapSystem(system));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    category?: string;
    notes?: string;
  };

  const db = getDb();
  const existing = await db.system.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.system.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.category !== undefined
        ? { category: body.category.trim() || "Other" }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: { components: true },
  });

  return NextResponse.json(mapSystem(updated));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id } = await ctx.params;
  const db = getDb();
  try {
    await db.system.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
