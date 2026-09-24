/**
 * Server-side client for BF → AiEA complete/reopen sync.
 * Best-effort — never throw into the BF complete/reopen path.
 */

function aieaBaseUrl(): string | null {
  const url =
    process.env.AIEA_URL?.trim() || process.env.AIEA_BASE_URL?.trim() || null;
  return url ? url.replace(/\/$/, "") : null;
}

function integrationSecret(): string | null {
  return process.env.BF_INTEGRATION_SECRET?.trim() || null;
}

export function getAieaConfig(): {
  configured: boolean;
  baseUrl: string | null;
  hasSecret: boolean;
} {
  const baseUrl = aieaBaseUrl();
  const hasSecret = Boolean(integrationSecret());
  return {
    configured: Boolean(baseUrl && hasSecret),
    baseUrl,
    hasSecret,
  };
}

async function postAiea(
  path: string,
  body: { bfTaskId: string },
): Promise<{ ok: boolean; error?: string; status?: number; skipped?: boolean }> {
  const cfg = getAieaConfig();
  if (!cfg.configured || !cfg.baseUrl) {
    return { ok: false, skipped: true, error: "AIEA_URL or BF_INTEGRATION_SECRET not set" };
  }
  const secret = integrationSecret()!;

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        // Vercel Protection Bypass for Automation (preview → protected AiEA preview). Unset in prod.
        ...(process.env.AIEA_PROTECTION_BYPASS?.trim()
          ? { "x-vercel-protection-bypass": process.env.AIEA_PROTECTION_BYPASS.trim() }
          : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 404 = no linked AiEA task — not an error for unlinked BF chores
    if (res.status === 404 && /task not found/i.test(text)) {
      return { ok: true, status: 404 };
    }
    return {
      ok: false,
      error: `${res.status} ${res.statusText}: ${text.slice(0, 500) || "(empty body)"}`,
      status: res.status,
    };
  }
  return { ok: true, status: res.status };
}

const AIEA_SYNC_ERROR = "Couldn't sync to AiEA — try again.";

/**
 * Best-effort: close linked AiEA task after BF complete.
 * Returns a user-facing error if a configured sync failed (BF change stays).
 */
export async function notifyAieaComplete(bfTaskId: string): Promise<string | null> {
  const result = await postAiea(
    "/api/integrations/bf-maintenance/complete",
    { bfTaskId },
  );
  if (!result.ok) {
    console.warn("AiEA complete sync failed:", result.error);
    return result.skipped ? null : AIEA_SYNC_ERROR;
  }
  return null;
}

/** Best-effort: reopen linked AiEA task after BF reopen. Same return contract. */
export async function notifyAieaReopen(bfTaskId: string): Promise<string | null> {
  const result = await postAiea(
    "/api/integrations/bf-maintenance/reopen",
    { bfTaskId },
  );
  if (!result.ok) {
    console.warn("AiEA reopen sync failed:", result.error);
    return result.skipped ? null : AIEA_SYNC_ERROR;
  }
  return null;
}
