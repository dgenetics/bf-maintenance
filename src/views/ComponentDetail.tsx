"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { maintenanceApi } from "@/lib/api";
import type { ScheduleJson, TaskJson } from "@/lib/maintenance";
import { ScheduleForm } from "@/components/maintenance/ScheduleForm";
import { TaskList } from "@/components/maintenance/TaskList";
import { StatusBadge } from "@/components/maintenance/TaskCard";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import type { Asset } from "@/types";

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-cream-200 bg-cream-50 shadow-xl sm:mx-4 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ComponentDetail() {
  const { systemId, componentId } = useParams();
  const navigate = useNavigate();
  const {
    assets,
    getAsset,
    refresh: refreshSystems,
    updateComponent,
  } = useData();
  const system = systemId ? getAsset(systemId) : undefined;
  const component = system?.components.find((c) => c.id === componentId);

  const [schedules, setSchedules] = useState<ScheduleJson[]>([]);
  const [tasks, setTasks] = useState<TaskJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveQuery, setMoveQuery] = useState("");
  const [moveTarget, setMoveTarget] = useState<Asset | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const otherSystems = useMemo(
    () =>
      assets
        .filter((a) => a.id !== systemId)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assets, systemId],
  );
  const hasOtherSystems = otherSystems.length > 0;

  const filteredSystems = useMemo(() => {
    const needle = moveQuery.trim().toLowerCase();
    if (!needle) return otherSystems;
    return otherSystems.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.category.toLowerCase().includes(needle),
    );
  }, [otherSystems, moveQuery]);

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

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const closeMoveSheet = () => {
    setMoveOpen(false);
    setMoveQuery("");
    setMoveTarget(null);
    setMoveError(null);
    setMoving(false);
  };

  const openMoveSheet = () => {
    setMenuOpen(false);
    setMoveQuery("");
    setMoveTarget(null);
    setMoveError(null);
    setMoveOpen(true);
  };

  const handleMove = async () => {
    if (!systemId || !componentId || !moveTarget || !component) return;
    setMoving(true);
    setMoveError(null);
    try {
      await updateComponent(systemId, componentId, {
        systemId: moveTarget.id,
      });
      const newId = moveTarget.id;
      closeMoveSheet();
      navigate(`/assets/${newId}/components/${componentId}`);
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "Failed to move");
      setMoving(false);
    }
  };

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
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted hover:bg-cream-100 hover:text-ink"
              aria-label="Component actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 w-56 overflow-hidden rounded-xl border border-cream-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={!hasOtherSystems}
                  title={
                    hasOtherSystems
                      ? undefined
                      : "No other systems to move to."
                  }
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  onClick={() => {
                    if (!hasOtherSystems) return;
                    openMoveSheet();
                  }}
                >
                  Move to another system…
                </button>
                {!hasOtherSystems && (
                  <p className="px-3 pb-2 text-xs text-muted">
                    No other systems to move to.
                  </p>
                )}
              </div>
            )}
          </div>
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
              embedActions
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
          emptyMessage="No open tasks. Add a schedule, or open Chores to materialize."
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

      {moveOpen && (
        <Sheet
          title={
            moveTarget
              ? "Move to another system"
              : "Move to another system"
          }
          onClose={closeMoveSheet}
        >
          {moveError && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              {moveError}
            </p>
          )}

          {moveTarget ? (
            <div className="space-y-4">
              <p className="text-sm text-ink">
                Move “{component.name}” to “{moveTarget.name}”?
              </p>
              <p className="text-sm text-muted">
                Schedules and chores stay with this part.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={moving}
                  onClick={() => void handleMove()}
                >
                  {moving ? "Moving…" : "Move"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={moving}
                  onClick={() => {
                    setMoveTarget(null);
                    setMoveError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Schedules and chores stay with this part.
              </p>
              {!hasOtherSystems ? (
                <p className="text-sm text-muted">
                  No other systems to move to.
                </p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      value={moveQuery}
                      onChange={(e) => setMoveQuery(e.target.value)}
                      placeholder="Search systems"
                      aria-label="Search systems"
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                  {filteredSystems.length === 0 ? (
                    <p className="text-sm text-muted">No matches</p>
                  ) : (
                    <ul className="divide-y divide-cream-200 overflow-hidden rounded-xl border border-cream-200 bg-white">
                      {filteredSystems.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left hover:bg-forest-50"
                            onClick={() => {
                              setMoveTarget(a);
                              setMoveError(null);
                            }}
                          >
                            <span className="font-medium text-ink">
                              {a.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted">
                              {a.category}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
