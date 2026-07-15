import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireIntegrationAuth } from "@/lib/integration-auth";
import { completeMaintenanceTask } from "@/lib/complete-task";

export const runtime = "nodejs";

/**
 * POST /api/integrations/tasks/complete
 * Service auth only. Body: { taskId: string, completedNotes?: string }
 *
 * Used by AiEA when a user completes an imported farm maintenance task.
 */
export async function POST(req: Request) {
  const denied = requireIntegrationAuth(req);
  if (denied) return denied;

  let body: { taskId?: string; completedNotes?: string | null };
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
  const result = await completeMaintenanceTask(
    db,
    taskId,
    body.completedNotes,
  );
  if (!result) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({
    source: "bf-maintenance",
    ...result,
  });
}
