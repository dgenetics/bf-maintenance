import type { PrismaClient } from "@/generated/prisma/client";
import {
  isOpenTaskStatus,
  mapTask,
  statusForDueDate,
  type TaskJson,
} from "@/lib/maintenance";

export type ReopenTaskResult = {
  task: TaskJson;
  alreadyOpen: boolean;
  /** Id of the auto-spawned next occurrence that was removed, if any. */
  deletedNextTaskId: string | null;
};

/** Max updatedAt − createdAt drift for a next occurrence to count as untouched. */
const UNTOUCHED_DRIFT_MS = 2_000;

/**
 * Reopen a completed (or cancelled) maintenance task — undoes
 * completeMaintenanceTask. Shared by the session UI route and the AiEA
 * integration route. Idempotent: reopening an open task is a no-op success.
 *
 * For a COMPLETED task on a schedule:
 * - "Next occurrence" = the first other task on the same schedule created at or
 *   after this task's completedAt (the schema has no explicit spawn link).
 *   If it is untouched — no completedAt and updatedAt within
 *   UNTOUCHED_DRIFT_MS of createdAt — it is deleted. Otherwise it is kept.
 * - The schedule is rewound: nextDueDate = this task's dueDate,
 *   lastCompletedAt = latest remaining COMPLETED task's completedAt (or null).
 * The task itself gets an open status from its dueDate and loses
 * completedAt/completedNotes.
 */
export async function reopenMaintenanceTask(
  db: PrismaClient,
  taskId: string,
): Promise<ReopenTaskResult | null> {
  const existing = await db.maintenanceTask.findUnique({
    where: { id: taskId },
  });
  if (!existing) return null;

  if (isOpenTaskStatus(existing.status)) {
    return { task: mapTask(existing), alreadyOpen: true, deletedNextTaskId: null };
  }

  // Conditional update keeps concurrent reopens idempotent.
  const { count } = await db.maintenanceTask.updateMany({
    where: { id: taskId, status: { in: ["COMPLETED", "CANCELLED"] } },
    data: {
      status: statusForDueDate(existing.dueDate),
      completedAt: null,
      completedNotes: null,
    },
  });
  const updated = await db.maintenanceTask.findUnique({ where: { id: taskId } });
  if (!updated) return null;
  if (count === 0) {
    return { task: mapTask(updated), alreadyOpen: true, deletedNextTaskId: null };
  }

  let deletedNextTaskId: string | null = null;
  const completedAt = existing.completedAt;

  if (existing.status === "COMPLETED" && existing.scheduleId) {
    if (completedAt) {
      const next = await db.maintenanceTask.findFirst({
        where: {
          id: { not: taskId },
          scheduleId: existing.scheduleId,
          createdAt: { gte: completedAt },
        },
        orderBy: { createdAt: "asc" },
      });
      if (
        next &&
        next.completedAt === null &&
        next.status !== "COMPLETED" &&
        Math.abs(next.updatedAt.getTime() - next.createdAt.getTime()) <=
          UNTOUCHED_DRIFT_MS
      ) {
        await db.maintenanceTask.delete({ where: { id: next.id } });
        deletedNextTaskId = next.id;
      }
    }

    const prev = await db.maintenanceTask.findFirst({
      where: {
        scheduleId: existing.scheduleId,
        status: "COMPLETED",
        completedAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
    });
    await db.maintenanceSchedule.update({
      where: { id: existing.scheduleId },
      data: {
        nextDueDate: existing.dueDate,
        lastCompletedAt: prev?.completedAt ?? null,
      },
    });
  }

  return { task: mapTask(updated), alreadyOpen: false, deletedNextTaskId };
}
