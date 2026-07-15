import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  intervalDaysFromFrequency,
  mapSchedule,
} from "@/lib/maintenance";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/schedules/:id
 * PATCH /api/schedules/:id
 * DELETE /api/schedules/:id
 */
export async function GET(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await ctx.params;
  const db = getDb();
  const schedule = await db.maintenanceSchedule.findUnique({
    where: { id },
  });
  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(mapSchedule(schedule));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await ctx.params;
  let body: {
    name?: string;
    description?: string | null;
    frequency?: string | null;
    intervalDays?: number | null;
    isRecurring?: boolean;
    nextDueDate?: string | null;
    lastCompletedAt?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.maintenanceSchedule.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let nextDueDate: Date | undefined;
  if (body.nextDueDate !== undefined) {
    if (body.nextDueDate === null || body.nextDueDate === "") {
      return NextResponse.json(
        { error: "nextDueDate cannot be empty" },
        { status: 400 },
      );
    }
    nextDueDate = new Date(body.nextDueDate);
    if (Number.isNaN(nextDueDate.getTime())) {
      return NextResponse.json(
        { error: "nextDueDate is invalid" },
        { status: 400 },
      );
    }
  }

  let lastCompletedAt: Date | null | undefined;
  if (body.lastCompletedAt !== undefined) {
    if (body.lastCompletedAt === null || body.lastCompletedAt === "") {
      lastCompletedAt = null;
    } else {
      lastCompletedAt = new Date(body.lastCompletedAt);
      if (Number.isNaN(lastCompletedAt.getTime())) {
        return NextResponse.json(
          { error: "lastCompletedAt is invalid" },
          { status: 400 },
        );
      }
    }
  }

  const frequency =
    body.frequency !== undefined
      ? body.frequency?.trim() || null
      : undefined;

  let intervalDays: number | null | undefined;
  if (body.intervalDays !== undefined) {
    intervalDays =
      body.intervalDays != null && Number.isFinite(body.intervalDays)
        ? Math.trunc(body.intervalDays)
        : null;
  } else if (frequency !== undefined) {
    intervalDays = intervalDaysFromFrequency(frequency);
  }

  const updated = await db.maintenanceSchedule.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description?.trim() || null }
        : {}),
      ...(frequency !== undefined ? { frequency } : {}),
      ...(intervalDays !== undefined ? { intervalDays } : {}),
      ...(body.isRecurring !== undefined
        ? { isRecurring: body.isRecurring }
        : {}),
      ...(nextDueDate !== undefined ? { nextDueDate } : {}),
      ...(lastCompletedAt !== undefined ? { lastCompletedAt } : {}),
    },
  });

  return NextResponse.json(mapSchedule(updated));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await ctx.params;
  const db = getDb();
  try {
    await db.maintenanceSchedule.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
