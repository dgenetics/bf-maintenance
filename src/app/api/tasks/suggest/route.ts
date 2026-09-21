import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  mapTask,
  OPEN_STATUSES,
  type TaskJson,
} from "@/lib/maintenance";

export const runtime = "nodejs";

/**
 * GET /api/tasks/suggest?componentId=xxx
 *
 * Creates an open MaintenanceTask (BACKLOG) for each schedule that does not
 * already have one. Idempotent. Does not overwrite board status from due dates.
 */
export async function GET(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  const componentId = new URL(req.url).searchParams.get("componentId")?.trim();
  if (!componentId) {
    return NextResponse.json(
      { error: "componentId is required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const component = await db.component.findUnique({
    where: { id: componentId },
    include: {
      schedules: { orderBy: { nextDueDate: "asc" } },
      tasks: {
        where: { status: { in: OPEN_STATUSES } },
      },
    },
  });

  if (!component) {
    return NextResponse.json(
      { error: "Component not found" },
      { status: 404 },
    );
  }

  if (component.schedules.length === 0) {
    return NextResponse.json({
      componentId,
      created: [] as TaskJson[],
      refreshed: [] as TaskJson[],
      skipped: [] as { scheduleId: string; reason: string }[],
      openTasks: [] as TaskJson[],
      message: "No schedules on this component — add a schedule first.",
    });
  }

  const created: TaskJson[] = [];
  const refreshed: TaskJson[] = [];
  const skipped: { scheduleId: string; reason: string }[] = [];

  const openTasks = await db.maintenanceTask.findMany({
    where: {
      componentId,
      status: { in: OPEN_STATUSES },
    },
  });

  const openBySchedule = new Map<string, (typeof openTasks)[0]>();
  for (const t of openTasks) {
    if (t.scheduleId) openBySchedule.set(t.scheduleId, t);
  }

  for (const schedule of component.schedules) {
    const existing = openBySchedule.get(schedule.id);
    if (existing) {
      skipped.push({
        scheduleId: schedule.id,
        reason: `open task already exists (${existing.title})`,
      });
      continue;
    }

    const task = await db.maintenanceTask.create({
      data: {
        componentId,
        scheduleId: schedule.id,
        title: schedule.name,
        description: schedule.description,
        dueDate: schedule.nextDueDate,
        status: "BACKLOG",
      },
    });
    created.push(mapTask(task));
  }

  const open = await db.maintenanceTask.findMany({
    where: {
      componentId,
      status: { in: OPEN_STATUSES },
    },
    orderBy: { dueDate: "asc" },
  });

  let message: string;
  if (created.length > 0) {
    message = `Created ${created.length} task${created.length === 1 ? "" : "s"}.`;
  } else if (skipped.length > 0) {
    message = "No new tasks — each schedule already has an open task.";
  } else {
    message = "Nothing to suggest.";
  }

  return NextResponse.json({
    componentId,
    created,
    refreshed,
    skipped,
    openTasks: open.map(mapTask),
    message,
  });
}
