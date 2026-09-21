import type {
  MaintenanceSchedule as DbSchedule,
  MaintenanceTask as DbTask,
  TaskStatus,
} from "@/generated/prisma/client";

/** Map frequency labels to interval days (null = custom / unknown). */
export function intervalDaysFromFrequency(
  frequency: string | null | undefined,
): number | null {
  if (!frequency) return null;
  const f = frequency.trim().toLowerCase();
  const map: Record<string, number> = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
    "60d": 60,
    "90d": 90,
    "6mo": 182,
    "1y": 365,
    "12mo": 365,
  };
  return map[f] ?? null;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export const FREQUENCY_OPTIONS = [
  { value: "7d", label: "Weekly (7 days)", days: 7 },
  { value: "14d", label: "Every 2 weeks", days: 14 },
  { value: "30d", label: "Monthly (30 days)", days: 30 },
  { value: "90d", label: "Quarterly (90 days)", days: 90 },
  { value: "6mo", label: "Every 6 months", days: 182 },
  { value: "1y", label: "Yearly", days: 365 },
  { value: "custom", label: "Custom", days: null },
] as const;

export type ScheduleJson = {
  id: string;
  componentId: string;
  name: string;
  description: string | null;
  frequency: string | null;
  intervalDays: number | null;
  isRecurring: boolean;
  nextDueDate: string;
  lastCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskJson = {
  id: string;
  scheduleId: string | null;
  componentId: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: TaskStatus;
  completedAt: string | null;
  completedNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function mapSchedule(s: DbSchedule): ScheduleJson {
  return {
    id: s.id,
    componentId: s.componentId,
    name: s.name,
    description: s.description,
    frequency: s.frequency,
    intervalDays: s.intervalDays,
    isRecurring: s.isRecurring,
    nextDueDate: s.nextDueDate.toISOString(),
    lastCompletedAt: s.lastCompletedAt
      ? s.lastCompletedAt.toISOString()
      : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function mapTask(t: DbTask): TaskJson {
  return {
    id: t.id,
    scheduleId: t.scheduleId,
    componentId: t.componentId,
    title: t.title,
    description: t.description,
    dueDate: t.dueDate.toISOString(),
    status: t.status,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    completedNotes: t.completedNotes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/** Derive PENDING / DUE_SOON / OVERDUE from due date for open tasks. */
export function statusForDueDate(
  dueDate: Date,
  now = new Date(),
): Extract<TaskStatus, "PENDING" | "DUE_SOON" | "OVERDUE"> {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil =
    (startOfUtcDay(dueDate).getTime() - startOfUtcDay(now).getTime()) /
    msPerDay;
  if (daysUntil < 0) return "OVERDUE";
  if (daysUntil <= 7) return "DUE_SOON";
  return "PENDING";
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

const OPEN_STATUSES = new Set(["PENDING", "DUE_SOON", "OVERDUE"]);

export function isOpenTaskStatus(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

export type DateBucket = "overdue" | "dueSoon" | "upcoming";

/**
 * Calendar bucket for an open task by due date vs today (UTC day),
 * independent of stored status (which can go stale).
 * - overdue: due < start of today
 * - dueSoon: due >= today && due <= today+7
 * - upcoming: due > today+7
 * Undated open tasks are treated as upcoming (API always requires dueDate today).
 */
export function dateBucketForTask(
  task: Pick<TaskJson, "dueDate" | "status">,
  now = new Date(),
): DateBucket | null {
  if (!isOpenTaskStatus(task.status)) return null;
  if (!task.dueDate) return "upcoming";
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return "upcoming";
  const derived = statusForDueDate(due, now);
  if (derived === "OVERDUE") return "overdue";
  if (derived === "DUE_SOON") return "dueSoon";
  return "upcoming";
}

export function partitionTasksByDueDate(
  tasks: TaskJson[],
  now = new Date(),
): {
  overdue: TaskJson[];
  dueSoon: TaskJson[];
  upcoming: TaskJson[];
  completed: TaskJson[];
} {
  const overdue: TaskJson[] = [];
  const dueSoon: TaskJson[] = [];
  const upcoming: TaskJson[] = [];
  const completed: TaskJson[] = [];

  for (const t of tasks) {
    if (t.status === "COMPLETED") {
      completed.push(t);
      continue;
    }
    if (t.status === "CANCELLED") continue;
    const bucket = dateBucketForTask(t, now);
    if (bucket === "overdue") overdue.push(t);
    else if (bucket === "dueSoon") dueSoon.push(t);
    else if (bucket === "upcoming") upcoming.push(t);
  }

  const byDueAsc = (a: TaskJson, b: TaskJson) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  overdue.sort(byDueAsc);
  dueSoon.sort(byDueAsc);
  upcoming.sort(byDueAsc);
  completed.sort(
    (a, b) =>
      new Date(b.completedAt ?? b.updatedAt).getTime() -
      new Date(a.completedAt ?? a.updatedAt).getTime(),
  );

  return { overdue, dueSoon, upcoming, completed };
}

/** Relative overdue label e.g. "overdue 38d"; null if not overdue. */
export function overdueRelativeLabel(
  dueDate: string,
  now = new Date(),
): string | null {
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const days =
    (startOfUtcDay(now).getTime() - startOfUtcDay(due).getTime()) / msPerDay;
  if (days < 1) return null;
  const n = Math.floor(days);
  return `overdue ${n}d`;
}

/** Remap orphan status strings (e.g. kanban BACKLOG) so Prisma enum reads succeed. */
export async function sanitizeUnknownTaskStatuses(
  db: { $executeRawUnsafe: (sql: string) => Promise<unknown> },
): Promise<number> {
  // SQLite / Turso: UPDATE returns changes via execute; ignore count if unavailable.
  const result = await db.$executeRawUnsafe(
    `UPDATE "MaintenanceTask" SET "status" = 'PENDING' WHERE "status" NOT IN ('PENDING', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'CANCELLED')`,
  );
  return typeof result === "number" ? result : 0;
}
