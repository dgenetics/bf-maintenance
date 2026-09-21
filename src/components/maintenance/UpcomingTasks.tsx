"use client";

import { Link } from "react-router-dom";
import type { TaskJson } from "@/lib/maintenance";
import { TaskList } from "./TaskList";
import { Button, Card } from "../ui";

export function UpcomingTasks({
  overdue,
  dueSoon,
  upcoming,
  completed,
  completedTotal,
  subtitleFor,
  onComplete,
  onCancel,
  busyId,
}: {
  overdue: TaskJson[];
  dueSoon: TaskJson[];
  upcoming: TaskJson[];
  completed?: TaskJson[];
  completedTotal?: number;
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
        <Section
          title="Recently completed"
          count={completed.length}
          tone="good"
          action={
            (completedTotal ?? 0) > completed.length ? (
              <Link to="/maintenance/archive">
                <Button size="sm" variant="ghost">
                  View all {completedTotal}
                </Button>
              </Link>
            ) : (
              <Link to="/maintenance/archive">
                <Button size="sm" variant="ghost">
                  Archive
                </Button>
              </Link>
            )
          }
        >
          <TaskList tasks={completed} emptyMessage="" />
        </Section>
      )}
      {(!completed || completed.length === 0) && (completedTotal ?? 0) > 0 && (
        <div className="text-center">
          <Link to="/maintenance/archive">
            <Button size="sm" variant="secondary">
              View completed archive
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  action,
  children,
}: {
  title: string;
  count: number;
  tone?: "alert" | "warn" | "good";
  action?: React.ReactNode;
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
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <Card className="border-dashed bg-cream-50/50">{children}</Card>
    </section>
  );
}
