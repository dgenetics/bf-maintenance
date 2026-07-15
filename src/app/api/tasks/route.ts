import { NextResponse } from "next/server";
import type { TaskStatus } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mapTask, statusForDueDate } from "@/lib/maintenance";

export const runtime = "nodejs";

const TASK_STATUSES: TaskStatus[] = [
  "PENDING",
  "DUE_SOON",
  "OVERDUE",
  "COMPLETED",
  "CANCELLED",
];

function isTaskStatus(v: string): v is TaskStatus {
  return (TASK_STATUSES as string[]).includes(v);
}

/**
 * GET /api/tasks?status=PENDING&componentId=xxx&scheduleId=xxx
 * POST /api/tasks — create a manual (or schedule-linked) task
 */
export async function GET(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status")?.trim();
  const componentId = searchParams.get("componentId")?.trim() || undefined;
  const scheduleId = searchParams.get("scheduleId")?.trim() || undefined;
  const openOnly = searchParams.get("open") === "1";

  let statusExact: TaskStatus | undefined;
  if (statusParam) {
    if (!isTaskStatus(statusParam)) {
      return NextResponse.json(
        {
          error: `Invalid status. Use one of: ${TASK_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    statusExact = statusParam;
  }

  const db = getDb();
  const statusFilter: TaskStatus | { in: TaskStatus[] } | undefined = openOnly
    ? { in: ["PENDING", "DUE_SOON", "OVERDUE"] }
    : statusExact;

  const tasks = await db.maintenanceTask.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(componentId ? { componentId } : {}),
      ...(scheduleId ? { scheduleId } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks.map(mapTask));
}

export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  let body: {
    componentId?: string;
    scheduleId?: string | null;
    title?: string;
    description?: string | null;
    dueDate?: string;
    status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const componentId = body.componentId?.trim();
  const title = body.title?.trim();
  if (!componentId) {
    return NextResponse.json(
      { error: "componentId is required" },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!body.dueDate) {
    return NextResponse.json({ error: "dueDate is required" }, { status: 400 });
  }

  const dueDate = new Date(body.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "dueDate is invalid" }, { status: 400 });
  }

  const db = getDb();
  const component = await db.component.findUnique({
    where: { id: componentId },
  });
  if (!component) {
    return NextResponse.json(
      { error: "Component not found" },
      { status: 404 },
    );
  }

  let scheduleId: string | null = body.scheduleId?.trim() || null;
  if (scheduleId) {
    const schedule = await db.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 },
      );
    }
    if (schedule.componentId !== componentId) {
      return NextResponse.json(
        { error: "scheduleId does not belong to componentId" },
        { status: 400 },
      );
    }
  }

  // Manual tasks: status from due date unless explicitly COMPLETED/CANCELLED
  let status: TaskStatus = statusForDueDate(dueDate);
  if (body.status && isTaskStatus(body.status)) {
    status = body.status;
  }

  const created = await db.maintenanceTask.create({
    data: {
      componentId,
      scheduleId,
      title,
      description: body.description?.trim() || null,
      dueDate,
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  return NextResponse.json(mapTask(created), { status: 201 });
}
