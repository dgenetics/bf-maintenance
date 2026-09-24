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
};

/**
 * Reopen a completed (or cancelled) maintenance task.
 *
 * v1 does NOT rewind schedule.lastCompletedAt / nextDueDate — those may already
 * have advanced on complete, and a next open task may already exist. We only
 * restore this task row to an open status derived from its dueDate.
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
    return { task: mapTask(existing), alreadyOpen: true };
  }

  const status = statusForDueDate(existing.dueDate);
  const updated = await db.maintenanceTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: null,
      completedNotes: null,
    },
  });

  return { task: mapTask(updated), alreadyOpen: false };
}
