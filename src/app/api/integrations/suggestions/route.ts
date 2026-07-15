import { NextResponse } from "next/server";
import { requireIntegrationAuth } from "@/lib/integration-auth";
import { getDb } from "@/lib/db";
import {
  mapTask,
  statusForDueDate,
  type TaskJson,
} from "@/lib/maintenance";

export const runtime = "nodejs";

export type BfSuggestion = {
  /** Stable id for AiEA idempotency */
  externalId: string;
  source: "bf-maintenance";
  title: string;
  description: string;
  dueAt: string;
  priority: number;
  status: TaskJson["status"];
  systemId: string;
  systemName: string;
  componentId: string;
  componentName: string;
  componentLocation: string;
  scheduleId: string | null;
  scheduleName: string | null;
  /** BF schedule frequency label (e.g. "90d") when from a schedule */
  frequency: string | null;
  intervalDays: number | null;
  isRecurring: boolean;
  taskId: string;
  reason: string;
};

/**
 * GET /api/integrations/suggestions
 *
 * Service auth only (not PIN cookie). Materializes open tasks from schedules
 * for all components, then returns an AiEA-friendly suggestion list.
 */
export async function GET(req: Request) {
  const denied = requireIntegrationAuth(req);
  if (denied) return denied;

  const db = getDb();
  const now = new Date();

  const components = await db.component.findMany({
    include: {
      system: true,
      schedules: true,
      tasks: {
        where: { status: { in: ["PENDING", "DUE_SOON", "OVERDUE"] } },
      },
    },
    orderBy: { name: "asc" },
  });

  let createdCount = 0;

  // Materialize missing open tasks from schedules (same rules as /api/tasks/suggest)
  for (const component of components) {
    const openBySchedule = new Map(
      component.tasks
        .filter((t) => t.scheduleId)
        .map((t) => [t.scheduleId as string, t]),
    );

    for (const schedule of component.schedules) {
      if (openBySchedule.has(schedule.id)) continue;

      const task = await db.maintenanceTask.create({
        data: {
          componentId: component.id,
          scheduleId: schedule.id,
          title: schedule.name,
          description: schedule.description,
          dueDate: schedule.nextDueDate,
          status: statusForDueDate(schedule.nextDueDate, now),
        },
      });
      component.tasks.push(task);
      createdCount += 1;
    }

    // Refresh statuses
    for (const task of component.tasks) {
      if (
        task.status === "COMPLETED" ||
        task.status === "CANCELLED"
      ) {
        continue;
      }
      const next = statusForDueDate(task.dueDate, now);
      if (next !== task.status) {
        const updated = await db.maintenanceTask.update({
          where: { id: task.id },
          data: { status: next },
        });
        Object.assign(task, updated);
      }
    }
  }

  // Reload open tasks with full context
  const open = await db.maintenanceTask.findMany({
    where: { status: { in: ["PENDING", "DUE_SOON", "OVERDUE"] } },
    include: {
      component: { include: { system: true } },
      schedule: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const suggestions: BfSuggestion[] = open.map((t) => {
    const priority =
      t.status === "OVERDUE" ? 1 : t.status === "DUE_SOON" ? 2 : 3;
    const reason =
      t.status === "OVERDUE"
        ? "Overdue maintenance"
        : t.status === "DUE_SOON"
          ? "Due within 7 days"
          : "Scheduled maintenance";

    const scheduleBit = t.schedule
      ? `Schedule: ${t.schedule.name}${t.schedule.frequency ? ` (${t.schedule.frequency})` : ""}`
      : "Manual maintenance task";

    const description = [
      t.description?.trim() || null,
      `System: ${t.component.system.name}`,
      `Component: ${t.component.name}`,
      t.component.location ? `Location: ${t.component.location}` : null,
      scheduleBit,
      t.component.serviceCompanyName
        ? `Service: ${t.component.serviceCompanyName}`
        : null,
      t.component.serviceCompanyContact
        ? `Contact: ${t.component.serviceCompanyContact}`
        : null,
      `Source: BF Maintenance · task ${t.id}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      externalId: `bf-task:${t.id}`,
      source: "bf-maintenance" as const,
      title: t.title,
      description,
      dueAt: t.dueDate.toISOString(),
      priority,
      status: t.status,
      systemId: t.component.systemId,
      systemName: t.component.system.name,
      componentId: t.componentId,
      componentName: t.component.name,
      componentLocation: t.component.location,
      scheduleId: t.scheduleId,
      scheduleName: t.schedule?.name ?? null,
      frequency: t.schedule?.frequency ?? null,
      intervalDays: t.schedule?.intervalDays ?? null,
      isRecurring: Boolean(t.schedule?.isRecurring),
      taskId: t.id,
      reason,
    };
  });

  return NextResponse.json({
    source: "bf-maintenance",
    generatedAt: now.toISOString(),
    materialized: createdCount,
    count: suggestions.length,
    suggestions,
  });
}
