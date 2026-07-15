import type { PrismaClient } from "@/generated/prisma/client";
import {
  addDays,
  intervalDaysFromFrequency,
  mapSchedule,
  mapTask,
  statusForDueDate,
  type ScheduleJson,
  type TaskJson,
} from "@/lib/maintenance";

export type CompleteTaskResult = {
  task: TaskJson;
  schedule: ScheduleJson | null;
  nextTask: TaskJson | null;
  alreadyComplete: boolean;
};

/**
 * Mark a maintenance task complete and advance a recurring schedule.
 * Shared by PIN-auth UI routes and AiEA integration routes.
 */
export async function completeMaintenanceTask(
  db: PrismaClient,
  taskId: string,
  completedNotes?: string | null,
): Promise<CompleteTaskResult | null> {
  const existing = await db.maintenanceTask.findUnique({
    where: { id: taskId },
    include: { schedule: true },
  });
  if (!existing) return null;

  if (existing.status === "COMPLETED") {
    return {
      task: mapTask(existing),
      schedule: existing.schedule ? mapSchedule(existing.schedule) : null,
      nextTask: null,
      alreadyComplete: true,
    };
  }

  const completedAt = new Date();
  const updated = await db.maintenanceTask.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      completedAt,
      completedNotes: completedNotes?.trim() || null,
    },
  });

  let nextTask: TaskJson | null = null;
  let schedule: ScheduleJson | null = null;

  if (existing.scheduleId && existing.schedule) {
    const sched = existing.schedule;
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

  return {
    task: mapTask(updated),
    schedule,
    nextTask,
    alreadyComplete: false,
  };
}
