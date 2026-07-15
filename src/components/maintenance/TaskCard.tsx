"use client";

import { format, parseISO } from "date-fns";
import type { TaskJson } from "@/lib/maintenance";
import { Button, Card } from "../ui";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  PENDING: "bg-stone-100 text-stone-700",
  DUE_SOON: "bg-amber-100 text-amber-900",
  OVERDUE: "bg-red-100 text-red-900",
  COMPLETED: "bg-forest-100 text-forest-900",
  CANCELLED: "bg-stone-100 text-stone-500 line-through",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        statusStyles[status] ?? statusStyles.PENDING,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function TaskCard({
  task,
  subtitle,
  onComplete,
  onCancel,
  busy,
}: {
  task: TaskJson;
  subtitle?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const open =
    task.status === "PENDING" ||
    task.status === "DUE_SOON" ||
    task.status === "OVERDUE";

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
        <StatusBadge status={task.status} />
      </div>
      {task.description && (
        <p className="text-sm text-muted whitespace-pre-wrap">
          {task.description}
        </p>
      )}
      {open && (onComplete || onCancel) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onComplete && (
            <Button size="sm" disabled={busy} onClick={onComplete}>
              Mark complete
            </Button>
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
