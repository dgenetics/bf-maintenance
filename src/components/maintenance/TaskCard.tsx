"use client";

import { format, parseISO } from "date-fns";
import type { TaskJson } from "@/lib/maintenance";
import {
  BOARD_COLUMNS,
  isOpenStatus,
  isOverdue,
  type BoardColumn,
} from "@/lib/maintenance";
import { Button, Card } from "../ui";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  ICEBOX: "bg-stone-100 text-stone-600",
  BACKLOG: "bg-cream-200 text-stone-800",
  CURRENT: "bg-forest-100 text-forest-900",
  COMPLETED: "bg-forest-100 text-forest-900",
  CANCELLED: "bg-stone-100 text-stone-500 line-through",
};

const COLUMN_LABELS: Record<BoardColumn, string> = {
  ICEBOX: "Icebox",
  BACKLOG: "Backlog",
  CURRENT: "Current",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        statusStyles[status] ?? statusStyles.BACKLOG,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-red-900 uppercase">
      Overdue
    </span>
  );
}

export function TaskCard({
  task,
  subtitle,
  onComplete,
  onCancel,
  onMove,
  busy,
}: {
  task: TaskJson;
  subtitle?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onMove?: (status: BoardColumn) => void;
  busy?: boolean;
}) {
  const open = isOpenStatus(task.status);
  const showOverdue =
    (task.status === "BACKLOG" || task.status === "CURRENT") &&
    isOverdue(task.dueDate);
  const moveTargets = BOARD_COLUMNS.filter((c) => c !== task.status);

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink">{task.title}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Due {format(parseISO(task.dueDate), "MMM d, yyyy")}
            {task.completedAt
              ? ` · done ${format(parseISO(task.completedAt), "MMM d")}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={task.status} />
          {showOverdue && <OverdueBadge />}
        </div>
      </div>
      {task.description && (
        <p className="text-sm text-muted whitespace-pre-wrap">
          {task.description}
        </p>
      )}
      {open && (onComplete || onCancel || onMove) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onComplete && (
            <Button size="sm" disabled={busy} onClick={onComplete}>
              Mark complete
            </Button>
          )}
          {onMove && moveTargets.length > 0 && (
            <select
              className="rounded-xl border border-cream-300 bg-white px-2 py-1.5 text-xs text-ink disabled:opacity-50"
              disabled={busy}
              defaultValue=""
              aria-label="Move to column"
              onChange={(e) => {
                const next = e.target.value as BoardColumn;
                if (!next) return;
                onMove(next);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Move to…
              </option>
              {moveTargets.map((c) => (
                <option key={c} value={c}>
                  {COLUMN_LABELS[c]}
                </option>
              ))}
            </select>
          )}
          {onCancel && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
