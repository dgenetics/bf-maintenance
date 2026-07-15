import type {
  Asset,
  AssetInput,
  SystemComponent,
  SystemComponentInput,
} from "@/types";

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
    throw new Error(
      "Failed to fetch — check that you are on the Next app (production or npm run dev), not an old Vite tab, and that you are online.",
    );
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

export const api = {
  listSystems: () => request<Asset[]>("/api/systems"),

  createSystem: (input: AssetInput) =>
    request<Asset>("/api/systems", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateSystem: (id: string, patch: Partial<AssetInput>) =>
    request<Asset>(`/api/systems/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteSystem: (id: string) =>
    request<void>(`/api/systems/${id}`, { method: "DELETE" }),

  addComponent: (systemId: string, input: SystemComponentInput) =>
    request<SystemComponent>(`/api/systems/${systemId}/components`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateComponent: (
    systemId: string,
    componentId: string,
    patch: Partial<SystemComponentInput>,
  ) =>
    request<SystemComponent>(
      `/api/systems/${systemId}/components/${componentId}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      },
    ),

  deleteComponent: (systemId: string, componentId: string) =>
    request<void>(`/api/systems/${systemId}/components/${componentId}`, {
      method: "DELETE",
    }),

  duplicateComponent: (systemId: string, componentId: string) =>
    request<SystemComponent>(
      `/api/systems/${systemId}/components/${componentId}/duplicate`,
      { method: "POST" },
    ),
};
