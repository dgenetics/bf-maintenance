import { NextResponse } from "next/server";
import type { TaskStatus } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  addDays,
  intervalDaysFromFrequency,
  mapSchedule,
  mapTask,
  statusForDueDate,
} from "@/lib/maintenance";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const TASK_STATUSES: TaskStatus[] = [
  "PENDING",
  "DUE_SOON",
  "OVERDUE",
  "COMPLETED",
  "CANCELLED",
];

/**
 * GET /api/tasks/:id
 * PATCH /api/tasks/:id — update fields or mark complete
 * DELETE /api/tasks/:id
 *
 * Complete: { status: "COMPLETED", completedNotes?: string }
 * For recurring schedules, advances nextDueDate and creates the next open task.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await ctx.params;
  const db = getDb();
  const task = await db.maintenanceTask.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(mapTask(task));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await ctx.params;
  let body: {
    title?: string;
    description?: string | null;
    dueDate?: string;
    status?: string;
    completedNotes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.maintenanceTask.findUnique({
    where: { id },
    include: { schedule: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const markingComplete =
    body.status === "COMPLETED" && existing.status !== "COMPLETED";

  let dueDate: Date | undefined;
  if (body.dueDate !== undefined) {
    dueDate = new Date(body.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "dueDate is invalid" }, { status: 400 });
    }
  }

  let status: TaskStatus | undefined;
  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status as TaskStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    status = body.status as TaskStatus;
  } else if (dueDate) {
    status = statusForDueDate(dueDate);
  }

  const updated = await db.maintenanceTask.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description?.trim() || null }
        : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(markingComplete
        ? {
            status: "COMPLETED" as const,
            completedAt: new Date(),
            completedNotes: body.completedNotes?.trim() || null,
          }
        : body.completedNotes !== undefined
          ? { completedNotes: body.completedNotes?.trim() || null }
          : {}),
      ...(status === "CANCELLED"
        ? { completedAt: null, completedNotes: body.completedNotes?.trim() || null }
        : {}),
    },
  });

  let nextTask = null;
  let schedule = null;

  if (markingComplete && existing.scheduleId && existing.schedule) {
    const sched = existing.schedule;
    const completedAt = new Date();
    const days =
      sched.intervalDays ?? intervalDaysFromFrequency(sched.frequency);

    if (sched.isRecurring && days && days > 0) {
      const nextDue = addDays(completedAt, days);
      schedule = mapSchedule(
        await db.maintenanceSchedule.update({
          where: { id: sched.id },
          data: {
            lastCompletedAt: completedAt,
            nextDueDate: nextDue,
          },
        }),
      );

      // Create next occurrence if none open
      const open = await db.maintenanceTask.findFirst({
        where: {
          scheduleId: sched.id,
          status: { in: ["PENDING", "DUE_SOON", "OVERDUE"] },
        },
      });
      if (!open) {
        nextTask = mapTask(
          await db.maintenanceTask.create({
            data: {
              componentId: existing.componentId,
              scheduleId: sched.id,
              title: sched.name,
              description: sched.description,
              dueDate: nextDue,
              status: statusForDueDate(nextDue),
            },
          }),
        );
      }
    } else {
      schedule = mapSchedule(
        await db.maintenanceSchedule.update({
          where: { id: sched.id },
          data: { lastCompletedAt: completedAt },
        }),
      );
    }
  }

  return NextResponse.json({
    task: mapTask(updated),
    schedule,
    nextTask,
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await ctx.params;
  const db = getDb();
  try {
    await db.maintenanceTask.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
