"use client";

import { useState } from "react";
import type { BoardColumn, TaskJson } from "@/lib/maintenance";
import { TaskList } from "./TaskList";
import { Card } from "../ui";
import { cn } from "@/lib/utils";

const COLUMNS: {
  key: BoardColumn;
  title: string;
  empty: string;
  tone?: "muted" | "good";
}[] = [
  { key: "ICEBOX", title: "Icebox", empty: "Nothing parked", tone: "muted" },
  { key: "BACKLOG", title: "Backlog", empty: "Backlog is empty" },
  {
    key: "CURRENT",
    title: "Current",
    empty: "Nothing in this cycle",
    tone: "good",
  },
];

export function UpcomingTasks({
  icebox,
  backlog,
  current,
  subtitleFor,
  onComplete,
  onCancel,
  onMove,
  busyId,
}: {
  icebox: TaskJson[];
  backlog: TaskJson[];
  current: TaskJson[];
  subtitleFor?: (task: TaskJson) => string | undefined;
  onComplete?: (task: TaskJson) => void;
  onCancel?: (task: TaskJson) => void;
  onMove?: (task: TaskJson, status: BoardColumn) => void;
  busyId?: string | null;
}) {
  const byKey: Record<BoardColumn, TaskJson[]> = {
    ICEBOX: icebox,
    BACKLOG: backlog,
    CURRENT: current,
  };
  const [mobileTab, setMobileTab] = useState<BoardColumn>("CURRENT");

  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-cream-200/60 p-1">
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              type="button"
              onClick={() => setMobileTab(col.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold whitespace-nowrap transition",
                mobileTab === col.key
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted",
              )}
            >
              {col.title}
              <span className="rounded-full bg-cream-200 px-1.5 py-0.5 text-[10px] tabular-nums">
                {byKey[col.key].length}
              </span>
            </button>
          ))}
        </div>
        {COLUMNS.filter((c) => c.key === mobileTab).map((col) => (
          <Section
            key={col.key}
            title={col.title}
            count={byKey[col.key].length}
            tone={col.tone}
            hideHeader
          >
            <TaskList
              tasks={byKey[col.key]}
              emptyMessage={col.empty}
              subtitleFor={subtitleFor}
              onComplete={onComplete}
              onCancel={onCancel}
              onMove={onMove}
              busyId={busyId}
            />
          </Section>
        ))}
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-3">
        {COLUMNS.map((col) => (
          <Section
            key={col.key}
            title={col.title}
            count={byKey[col.key].length}
            tone={col.tone}
          >
            <TaskList
              tasks={byKey[col.key]}
              emptyMessage={col.empty}
              subtitleFor={subtitleFor}
              onComplete={onComplete}
              onCancel={onCancel}
              onMove={onMove}
              busyId={busyId}
            />
          </Section>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  hideHeader,
  children,
}: {
  title: string;
  count: number;
  tone?: "muted" | "good";
  hideHeader?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      {!hideHeader && (
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <span
            className={
              tone === "good"
                ? "rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-semibold text-forest-900"
                : "rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-semibold text-muted"
            }
          >
            {count}
          </span>
        </div>
      )}
      <Card className="border-dashed bg-cream-50/50">{children}</Card>
    </section>
  );
}
