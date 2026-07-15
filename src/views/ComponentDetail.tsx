"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { maintenanceApi } from "@/lib/api";
import type { ScheduleJson, TaskJson } from "@/lib/maintenance";
import { ScheduleForm } from "@/components/maintenance/ScheduleForm";
import { TaskList } from "@/components/maintenance/TaskList";
import { StatusBadge } from "@/components/maintenance/TaskCard";
import { Button, Card, PageHeader } from "@/components/ui";

export function ComponentDetail() {
  const { systemId, componentId } = useParams();
  const navigate = useNavigate();
  const { getAsset, refresh: refreshSystems } = useData();
  const system = systemId ? getAsset(systemId) : undefined;
  const component = system?.components.find((c) => c.id === componentId);

  const [schedules, setSchedules] = useState<ScheduleJson[]>([]);
  const [tasks, setTasks] = useState<TaskJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!componentId) return;
    setError(null);
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        maintenanceApi.listSchedules(componentId),
        maintenanceApi.listTasks({ componentId }),
      ]);
      setSchedules(s);
      setTasks(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [componentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!system || !component || !componentId) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Component not found.</p>
        <Link to="/">
          <Button variant="secondary" size="sm">
            Back to systems
          </Button>
        </Link>
      </div>
    );
  }

  const openTasks = tasks.filter((t) =>
    ["PENDING", "DUE_SOON", "OVERDUE"].includes(t.status),
  );
  const doneTasks = tasks
    .filter((t) => t.status === "COMPLETED")
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHeader
        title={component.name}
        subtitle={`${system.name}${component.location ? ` · ${component.location}` : ""}`}
        action={
          <Button
            size="sm"
            variant="secondary"
            disabled={suggesting}
            onClick={() => {
              void (async () => {
                setSuggesting(true);
                setError(null);
                setInfo(null);
                try {
                  const result =
                    await maintenanceApi.suggestTasks(componentId);
                  await load();
                  setInfo(
                    result.message ??
                      (result.created.length
                        ? `Created ${result.created.length} task(s).`
                        : "No new tasks created."),
                  );
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Suggest failed",
                  );
                } finally {
                  setSuggesting(false);
                }
              })();
            }}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${suggesting ? "animate-spin" : ""}`}
            />
            Suggest tasks
          </Button>
        }
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-xl bg-forest-50 px-3 py-2 text-sm text-forest-900">
          {info}
        </p>
      )}

      {/* Schedules */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-forest-800 uppercase">
              Maintenance schedules
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Recurring or one-off service plans
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add schedule
          </Button>
        </div>

        {showForm && (
          <div className="mb-4 rounded-xl border border-forest-600/20 bg-forest-50/40 p-3">
            <ScheduleForm
              componentId={componentId}
              busy={saving}
              onCancel={() => setShowForm(false)}
              onSubmit={async (input) => {
                setSaving(true);
                setError(null);
                setInfo(null);
                try {
                  await maintenanceApi.createSchedule(input);
                  // Materialize an open task for the new schedule immediately
                  const result =
                    await maintenanceApi.suggestTasks(componentId);
                  setShowForm(false);
                  await load();
                  setInfo(
                    result.message ??
                      "Schedule saved and task generated.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted">
            No schedules yet. Add one for oil changes, inspections, etc.
          </p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Next due{" "}
                    {format(parseISO(s.nextDueDate), "MMM d, yyyy")}
                    {s.frequency ? ` · ${s.frequency}` : ""}
                    {s.isRecurring ? " · recurring" : " · one-off"}
                  </p>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted">{s.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-muted hover:text-red-700"
                  aria-label={`Delete ${s.name}`}
                  onClick={() => {
                    if (!confirm(`Delete schedule “${s.name}”?`)) return;
                    void maintenanceApi
                      .deleteSchedule(s.id)
                      .then(() => load())
                      .catch((e: Error) => setError(e.message));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Open tasks */}
      <Card>
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-forest-800 uppercase">
          Open tasks
        </h3>
        <TaskList
          tasks={openTasks}
          emptyMessage="No open tasks. Use Suggest tasks or add a schedule."
          busyId={busyId}
          onComplete={(task) => {
            void (async () => {
              setBusyId(task.id);
              try {
                await maintenanceApi.completeTask(task.id);
                await load();
                await refreshSystems();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusyId(null);
              }
            })();
          }}
          onCancel={(task) => {
            void (async () => {
              setBusyId(task.id);
              try {
                await maintenanceApi.cancelTask(task.id);
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusyId(null);
              }
            })();
          }}
        />
      </Card>

      {doneTasks.length > 0 && (
        <Card>
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-forest-800 uppercase">
            Recently completed
          </h3>
          <ul className="space-y-2">
            {doneTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-ink">{t.title}</span>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Link
        to={`/assets/${system.id}`}
        className="block text-center text-sm text-forest-800 hover:underline"
      >
        View system: {system.name}
      </Link>
    </div>
  );
}
