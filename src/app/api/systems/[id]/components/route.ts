import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { componentCreateData, mapComponent } from "@/lib/mappers";
import type { SystemComponentInput } from "@/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id: systemId } = await ctx.params;
  const body = (await req.json()) as SystemComponentInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  const system = await db.system.findUnique({
    where: { id: systemId },
    include: { components: true },
  });
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const maxOrder = system.components.reduce(
    (m, c) => Math.max(m, c.sortOrder),
    -1,
  );

  const created = await db.component.create({
    data: {
      systemId,
      ...componentCreateData(body, maxOrder + 1),
    },
  });

  await db.system.update({
    where: { id: systemId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(mapComponent(created), { status: 201 });
}
