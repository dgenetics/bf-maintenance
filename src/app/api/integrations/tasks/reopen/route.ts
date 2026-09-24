import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireIntegrationAuth } from "@/lib/integration-auth";
import { reopenMaintenanceTask } from "@/lib/reopen-task";

export const runtime = "nodejs";

/**
 * POST /api/integrations/tasks/reopen
 * Service auth only. Body: { taskId: string }
 *
 * Used by AiEA when a user reopens a linked imported farm maintenance task.
 * Does not rewind schedule (v1). Does not notify AiEA (caller is AiEA).
 */
export async function POST(req: Request) {
  const denied = requireIntegrationAuth(req);
  if (denied) return denied;

  let body: { taskId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const taskId = body.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const db = getDb();
  const result = await reopenMaintenanceTask(db, taskId);
  if (!result) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({
    source: "bf-maintenance",
    ...result,
  });
}
