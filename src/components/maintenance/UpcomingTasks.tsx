"use client";

import type { TaskJson } from "@/lib/maintenance";
import { TaskList } from "./TaskList";
import { Card } from "../ui";

export function UpcomingTasks({
  overdue,
  dueSoon,
  upcoming,
  completed,
  subtitleFor,
  onComplete,
  onCancel,
  busyId,
}: {
  overdue: TaskJson[];
  dueSoon: TaskJson[];
  upcoming: TaskJson[];
  completed?: TaskJson[];
  subtitleFor?: (task: TaskJson) => string | undefined;
  onComplete?: (task: TaskJson) => void;
  onCancel?: (task: TaskJson) => void;
  busyId?: string | null;
}) {
  return (
    <div className="space-y-5">
      <Section title="Overdue" count={overdue.length} tone="alert">
        <TaskList
          tasks={overdue}
          emptyMessage="Nothing overdue"
          subtitleFor={subtitleFor}
          onComplete={onComplete}
          onCancel={onCancel}
          busyId={busyId}
        />
      </Section>
      <Section title="Due soon" count={dueSoon.length} tone="warn">
        <TaskList
          tasks={dueSoon}
          emptyMessage="Nothing due in the next week"
          subtitleFor={subtitleFor}
          onComplete={onComplete}
          onCancel={onCancel}
          busyId={busyId}
        />
      </Section>
      <Section title="Upcoming" count={upcoming.length}>
        <TaskList
          tasks={upcoming}
          emptyMessage="No further open tasks"
          subtitleFor={subtitleFor}
          onComplete={onComplete}
          onCancel={onCancel}
          busyId={busyId}
        />
      </Section>
      {completed && completed.length > 0 && (
        <Section title="Recently completed" count={completed.length} tone="good">
          <TaskList tasks={completed} emptyMessage="" />
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "alert" | "warn" | "good";
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span
          className={
            tone === "alert"
              ? "rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-900"
              : tone === "warn"
                ? "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                : tone === "good"
                  ? "rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-semibold text-forest-900"
                  : "rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-semibold text-muted"
          }
        >
          {count}
        </span>
      </div>
      <Card className="border-dashed bg-cream-50/50">{children}</Card>
    </section>
  );
}
