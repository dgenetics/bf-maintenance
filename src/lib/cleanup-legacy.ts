/**
 * Clear remnants of the earlier Vite + localStorage PWA (seed data + SW cache).
 * Returns true if a controlling service worker was present (caller should reload).
 */
export async function cleanupLegacyClient(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    localStorage.removeItem("bf-maintenance-v1");
    localStorage.removeItem("bf-maintenance-v2");
  } catch {
    /* ignore */
  }

  let hadController = false;

  if ("serviceWorker" in navigator) {
    try {
      hadController = Boolean(navigator.serviceWorker.controller);
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) hadController = true;
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* ignore */
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      /* ignore */
    }
  }

  return hadController;
}
