import { NextResponse } from "next/server";
import type { TaskStatus } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { completeMaintenanceTask } from "@/lib/complete-task";
import { mapTask, statusForDueDate } from "@/lib/maintenance";

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

  // Completion path (shared with AiEA integration)
  if (body.status === "COMPLETED") {
    const result = await completeMaintenanceTask(db, id, body.completedNotes);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      task: result.task,
      schedule: result.schedule,
      nextTask: result.nextTask,
    });
  }

  const existing = await db.maintenanceTask.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
      ...(body.completedNotes !== undefined
        ? { completedNotes: body.completedNotes?.trim() || null }
        : {}),
      ...(status === "CANCELLED"
        ? {
            completedAt: null,
            completedNotes: body.completedNotes?.trim() || null,
          }
        : {}),
    },
  });

  return NextResponse.json({
    task: mapTask(updated),
    schedule: null,
    nextTask: null,
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
