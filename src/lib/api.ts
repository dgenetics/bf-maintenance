/**
 * Client helpers for maintenance schedules & tasks.
 * Complements systems API in api-client.ts.
 */
import type { ScheduleJson, TaskJson } from "@/lib/maintenance";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Failed to fetch — check network / that the app is online.");
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.assign("/");
      throw new Error("Session expired — enter PIN again");
    }
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type CreateScheduleInput = {
  componentId: string;
  name: string;
  description?: string | null;
  frequency?: string | null;
  intervalDays?: number | null;
  isRecurring?: boolean;
  nextDueDate: string;
};

export type CreateTaskInput = {
  componentId: string;
  scheduleId?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  status?: string;
};

export type SuggestResult = {
  componentId: string;
  created: TaskJson[];
  refreshed: TaskJson[];
  skipped: { scheduleId: string; reason: string }[];
  openTasks: TaskJson[];
  message?: string;
};

export type CompleteTaskResult = {
  task: TaskJson;
  schedule: ScheduleJson | null;
  nextTask: TaskJson | null;
};

export const maintenanceApi = {
  listSchedules: (componentId?: string) => {
    const q = componentId
      ? `?componentId=${encodeURIComponent(componentId)}`
      : "";
    return request<ScheduleJson[]>(`/api/schedules${q}`);
  },

  createSchedule: (input: CreateScheduleInput) =>
    request<ScheduleJson>("/api/schedules", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateSchedule: (id: string, patch: Partial<CreateScheduleInput>) =>
    request<ScheduleJson>(`/api/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteSchedule: (id: string) =>
    request<void>(`/api/schedules/${id}`, { method: "DELETE" }),

  listTasks: (params?: {
    status?: string;
    componentId?: string;
    scheduleId?: string;
    open?: boolean;
  }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.componentId) sp.set("componentId", params.componentId);
    if (params?.scheduleId) sp.set("scheduleId", params.scheduleId);
    if (params?.open) sp.set("open", "1");
    const q = sp.toString();
    return request<TaskJson[]>(`/api/tasks${q ? `?${q}` : ""}`);
  },

  createTask: (input: CreateTaskInput) =>
    request<TaskJson>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  completeTask: (id: string, completedNotes?: string) =>
    request<CompleteTaskResult>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "COMPLETED",
        completedNotes: completedNotes ?? null,
      }),
    }),

  cancelTask: (id: string) =>
    request<CompleteTaskResult>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED" }),
    }),

  suggestTasks: (componentId: string, all = false) => {
    const sp = new URLSearchParams({ componentId });
    if (all) sp.set("all", "1");
    return request<SuggestResult>(`/api/tasks/suggest?${sp}`);
  },
};
