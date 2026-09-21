import type {
  MaintenanceSchedule as DbSchedule,
  MaintenanceTask as DbTask,
  TaskStatus,
} from "@/generated/prisma/client";

/** Board statuses that count as open (shown on the kanban). */
export const OPEN_STATUSES: TaskStatus[] = ["ICEBOX", "BACKLOG", "CURRENT"];

export const BOARD_COLUMNS = ["ICEBOX", "BACKLOG", "CURRENT"] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

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

export function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** UI overdue badge only — never a board status. */
export function isOverdue(dueDate: string | Date, now = new Date()): boolean {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return false;
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return dueDay.getTime() < startOfLocalDay(now).getTime();
}

/** Sort/priority urgency from due date (1=overdue, 2=soon, 3=later). */
export function dueUrgency(
  dueDate: Date,
  now = new Date(),
): { priority: number; reason: string } {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil =
    (startOfLocalDay(dueDate).getTime() - startOfLocalDay(now).getTime()) /
    msPerDay;
  if (daysUntil < 0) return { priority: 1, reason: "Overdue maintenance" };
  if (daysUntil <= 7) return { priority: 2, reason: "Due within 7 days" };
  return { priority: 3, reason: "Scheduled maintenance" };
}

export function isOpenStatus(status: TaskStatus): boolean {
  return (OPEN_STATUSES as string[]).includes(status);
}
