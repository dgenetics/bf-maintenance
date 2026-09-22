import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  mapTask,
  statusForDueDate,
  type TaskJson,
} from "@/lib/maintenance";

export const runtime = "nodejs";

type Skipped = { scheduleId: string; reason: string };

type MaterializeResult = {
  componentId: string;
  created: TaskJson[];
  refreshed: TaskJson[];
  skipped: Skipped[];
  openTasks: TaskJson[];
  message: string;
};

/**
 * Idempotent: create missing open tasks for each schedule on a component,
 * and refresh open-task statuses from due dates.
 */
async function materializeForComponent(
  db: ReturnType<typeof getDb>,
  componentId: string,
  now: Date,
): Promise<MaterializeResult | { error: string; status: number }> {
  const component = await db.component.findUnique({
    where: { id: componentId },
    include: {
      schedules: { orderBy: { nextDueDate: "asc" } },
      tasks: {
        where: { status: { in: ["PENDING", "DUE_SOON", "OVERDUE"] } },
      },
    },
  });

  if (!component) {
    return { error: "Component not found", status: 404 };
  }

  if (component.schedules.length === 0) {
    return {
      componentId,
      created: [] as TaskJson[],
      refreshed: [] as TaskJson[],
      skipped: [] as Skipped[],
      openTasks: [] as TaskJson[],
      message: "No schedules on this component — add a schedule first.",
    };
  }

  const created: TaskJson[] = [];
  const refreshed: TaskJson[] = [];
  const skipped: Skipped[] = [];

  for (const task of component.tasks) {
    if (task.status === "COMPLETED" || task.status === "CANCELLED") continue;
    const nextStatus = statusForDueDate(task.dueDate, now);
    if (nextStatus !== task.status) {
      const updated = await db.maintenanceTask.update({
        where: { id: task.id },
        data: { status: nextStatus },
      });
      refreshed.push(mapTask(updated));
    }
  }

  const openTasks = await db.maintenanceTask.findMany({
    where: {
      componentId,
      status: { in: ["PENDING", "DUE_SOON", "OVERDUE"] },
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
        status: statusForDueDate(schedule.nextDueDate, now),
      },
    });
    created.push(mapTask(task));
  }

  const open = await db.maintenanceTask.findMany({
    where: {
      componentId,
      status: { in: ["PENDING", "DUE_SOON", "OVERDUE"] },
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

  return {
    componentId,
    created,
    refreshed,
    skipped,
    openTasks: open.map(mapTask),
    message,
  };
}

/**
 * GET /api/tasks/suggest?componentId=xxx
 * GET /api/tasks/suggest?all=1
 *
 * Creates an open MaintenanceTask for each schedule that does not already
 * have one. Idempotent. Also refreshes open-task statuses from due dates.
 * With all=1, runs for every component that has schedules.
 */
export async function GET(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  const sp = new URL(req.url).searchParams;
  const allParam = sp.get("all")?.trim();
  const all = allParam === "1" || allParam === "true";
  const componentId = sp.get("componentId")?.trim();

  const db = getDb();
  const now = new Date();

  if (all) {
    const components = await db.component.findMany({
      where: { schedules: { some: {} } },
      select: { id: true },
      orderBy: { name: "asc" },
    });

    const created: TaskJson[] = [];
    const refreshed: TaskJson[] = [];
    const skipped: Skipped[] = [];
    let componentsProcessed = 0;

    for (const { id } of components) {
      const result = await materializeForComponent(db, id, now);
      if ("error" in result) continue;
      componentsProcessed += 1;
      created.push(...result.created);
      refreshed.push(...result.refreshed);
      skipped.push(...result.skipped);
    }

    let message: string;
    if (created.length > 0) {
      message = `Created ${created.length} task${created.length === 1 ? "" : "s"} across ${componentsProcessed} component${componentsProcessed === 1 ? "" : "s"}.`;
    } else if (componentsProcessed > 0) {
      message =
        "No new tasks — open tasks already exist for schedules.";
    } else {
      message =
        "No schedules found. Open a component and add a maintenance schedule first.";
    }

    return NextResponse.json({
      all: true,
      created,
      refreshed,
      skipped,
      componentsProcessed,
      message,
    });
  }

  if (!componentId) {
    return NextResponse.json(
      { error: "componentId is required" },
      { status: 400 },
    );
  }

  const result = await materializeForComponent(db, componentId, now);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result);
}
