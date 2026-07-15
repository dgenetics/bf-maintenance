"use client";

import type { TaskJson } from "@/lib/maintenance";
import { TaskCard } from "./TaskCard";

export function TaskList({
  tasks,
  emptyMessage = "No tasks",
  subtitleFor,
  onComplete,
  onCancel,
  busyId,
}: {
  tasks: TaskJson[];
  emptyMessage?: string;
  subtitleFor?: (task: TaskJson) => string | undefined;
  onComplete?: (task: TaskJson) => void;
  onCancel?: (task: TaskJson) => void;
  busyId?: string | null;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          subtitle={subtitleFor?.(task)}
          busy={busyId === task.id}
          onComplete={
            onComplete ? () => onComplete(task) : undefined
          }
          onCancel={onCancel ? () => onCancel(task) : undefined}
        />
      ))}
    </div>
  );
}
