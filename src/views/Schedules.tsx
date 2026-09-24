"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { MoreHorizontal, Plus, Search, CalendarRange } from "lucide-react";
import { maintenanceApi, type CreateScheduleInput } from "@/lib/api";
import {
  frequencyLabel,
  urgencyForNextDueDate,
  type DateBucket,
  type ScheduleJson,
} from "@/lib/maintenance";
import { useData } from "@/context/DataContext";
import { ScheduleForm } from "@/components/maintenance/ScheduleForm";
import { EmptyState } from "@/components/EmptyState";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const RECENT_KEY = "bf-schedule-component-recent";
const URGENCY_LABEL: Record<DateBucket, string> = {
  overdue: "Overdue",
  dueSoon: "Due soon",
  upcoming: "Upcoming",
};
const URGENCY_STYLE: Record<DateBucket, string> = {
  overdue: "bg-red-100 text-red-900",
  dueSoon: "bg-amber-100 text-amber-900",
  upcoming: "bg-stone-100 text-stone-700",
};

type ComponentPick = {
  componentId: string;
  systemId: string;
  systemName: string;
  componentName: string;
  label: string;
};

function readRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function pushRecentId(componentId: string) {
  const next = [
    componentId,
    ...readRecentIds().filter((id) => id !== componentId),
  ].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function UrgencyChip({ urgency }: { urgency: DateBucket }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        URGENCY_STYLE[urgency],
      )}
    >
      {URGENCY_LABEL[urgency]}
    </span>
  );
}

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

function ComponentTypeahead({
  picks,
  value,
  onChange,
}: {
  picks: ComponentPick[];
  value: ComponentPick | null;
  onChange: (pick: ComponentPick | null) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const recentIds = useMemo(() => readRecentIds(), [open, value?.componentId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = picks;
    if (needle) {
      list = picks.filter((p) => p.label.toLowerCase().includes(needle));
    } else if (recentIds.length) {
      const recent = recentIds
        .map((id) => picks.find((p) => p.componentId === id))
        .filter((p): p is ComponentPick => Boolean(p));
      const rest = picks.filter((p) => !recentIds.includes(p.componentId));
      list = [...recent, ...rest];
    }
    return list.slice(0, 40);
  }, [picks, q, recentIds]);

  return (
    <div className="space-y-1">
      <Field label="System / Component">
        <Input
          value={value ? value.label : q}
          onChange={(e) => {
            onChange(null);
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="System / Component"
          aria-label="System / Component"
          autoComplete="off"
        />
      </Field>
      <p className="text-xs text-muted">Schedules belong to a component.</p>
      {open && !value && (
        <ul className="max-h-48 overflow-y-auto rounded-xl border border-cream-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No matches</li>
          ) : (
            filtered.map((p) => (
              <li key={p.componentId}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-forest-50"
                  onClick={() => {
                    onChange(p);
                    setQ("");
                    setOpen(false);
                    pushRecentId(p.componentId);
                  }}
                >
                  {p.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {value && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onChange(null);
            setQ("");
            setOpen(true);
          }}
        >
          Change component
        </Button>
      )}
    </div>
  );
}

export function Schedules() {
  const { assets } = useData();
  const [params, setParams] = useSearchParams();
  const [schedules, setSchedules] = useState<ScheduleJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addPick, setAddPick] = useState<ComponentPick | null>(null);
  const [editTarget, setEditTarget] = useState<ScheduleJson | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const q = params.get("q") ?? "";
  const systemId = params.get("system") ?? "all";
  const addRequested = params.get("add") === "1";

  const componentMeta = useMemo(() => {
    const byId = new Map<
      string,
      { systemId: string; systemName: string; componentName: string }
    >();
    for (const s of assets) {
      for (const c of s.components) {
        byId.set(c.id, {
          systemId: s.id,
          systemName: s.name,
          componentName: c.name,
        });
      }
    }
    return byId;
  }, [assets]);

  const picks = useMemo<ComponentPick[]>(() => {
    const list: ComponentPick[] = [];
    for (const s of [...assets].sort((a, b) => a.name.localeCompare(b.name))) {
      for (const c of [...s.components].sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        list.push({
          componentId: c.id,
          systemId: s.id,
          systemName: s.name,
          componentName: c.name,
          label: `${s.name} · ${c.name}`,
        });
      }
    }
    return list;
  }, [assets]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await maintenanceApi.listSchedules();
      setSchedules(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuId(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return schedules.filter((s) => {
      const meta = componentMeta.get(s.componentId);
      if (systemId !== "all") {
        if (!meta || meta.systemId !== systemId) return false;
      }
      if (needle) {
        const hay = [
          s.name,
          s.description ?? "",
          s.frequency ?? "",
          meta?.systemName ?? "",
          meta?.componentName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [schedules, componentMeta, systemId, q]);

  const filtering = Boolean(q.trim()) || systemId !== "all";

  function openAdd() {
    setAddPick(null);
    setAddOpen(true);
  }

  useEffect(() => {
    if (!addRequested) return;
    setAddPick(null);
    setAddOpen(true);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("add");
        return next;
      },
      { replace: true },
    );
  }, [addRequested, setParams]);

  async function handleCreate(input: CreateScheduleInput) {
    setSaving(true);
    setError(null);
    try {
      const created = await maintenanceApi.createSchedule(input);
      pushRecentId(input.componentId);
      setAddOpen(false);
      setAddPick(null);
      await load();
      setHighlightId(created.id);
      window.setTimeout(() => setHighlightId(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(input: CreateScheduleInput) {
    if (!editTarget) return;
    setSaving(true);
    setError(null);
    try {
      await maintenanceApi.updateSchedule(editTarget.id, {
        name: input.name,
        description: input.description,
        frequency: input.frequency,
        intervalDays: input.intervalDays,
        isRecurring: input.isRecurring,
        nextDueDate: input.nextDueDate,
      });
      setEditTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: ScheduleJson) {
    if (!confirm(`Delete schedule “${s.name}”?`)) return;
    setMenuId(null);
    setError(null);
    try {
      await maintenanceApi.deleteSchedule(s.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedules"
        subtitle="When plans come due across all systems"
      />

      <Card className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            value={q}
            onChange={(e) => patchParams({ q: e.target.value })}
            placeholder="Search schedules"
            aria-label="Search schedules"
          />
        </div>
        <Field label="System">
          <Select
            value={systemId}
            onChange={(e) => patchParams({ system: e.target.value })}
            aria-label="Filter by system"
          >
            <option value="all">All systems</option>
            {[...assets]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
        </Field>
        {filtering && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setParams({}, { replace: true })}
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading schedules…</p>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No schedules — add one"
          description="Service plans across systems show up here."
          action={
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add schedule
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No schedules match"
          description="Try clearing filters or a different search."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setParams({}, { replace: true })}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => {
            const meta = componentMeta.get(s.componentId);
            const u = urgencyForNextDueDate(s.nextDueDate);
            const locLabel = meta
              ? `${meta.systemName} · ${meta.componentName}`
              : "Unknown component";
            return (
              <li key={s.id}>
                <Card
                  className={cn(
                    "relative !p-3",
                    highlightId === s.id && "ring-2 ring-forest-600/40",
                    menuId === s.id && "z-30",
                  )}
                  onClick={() => setEditTarget(s)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-ink">{s.name}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-xs tabular-nums text-muted">
                            {format(parseISO(s.nextDueDate), "MMM d")}
                          </span>
                          <UrgencyChip urgency={u} />
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{locLabel}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {frequencyLabel(s.frequency, s.intervalDays)}
                        {" · "}
                        {s.isRecurring ? "Recurring" : "One-off"}
                      </p>
                    </div>
                    <div
                      className="relative shrink-0"
                      ref={menuId === s.id ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-muted hover:bg-cream-100 hover:text-ink"
                        aria-label={`Actions for ${s.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId((id) => (id === s.id ? null : s.id));
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuId === s.id && (
                        <div
                          className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border border-cream-200 bg-white py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-cream-100"
                            onClick={() => {
                              setMenuId(null);
                              setEditTarget(s);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                            onClick={() => void handleDelete(s)}
                          >
                            Delete
                          </button>
                          {meta && (
                            <Link
                              to={`/assets/${meta.systemId}?part=${s.componentId}`}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-cream-100"
                              onClick={() => setMenuId(null)}
                            >
                              View component
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {addOpen && (
        <Sheet
          title="Add schedule"
          onClose={() => {
            setAddOpen(false);
            setAddPick(null);
          }}
        >
          <div className="space-y-4">
            <ComponentTypeahead
              picks={picks}
              value={addPick}
              onChange={setAddPick}
            />
            {addPick ? (
              <ScheduleForm
                key={addPick.componentId}
                formId="schedule-add-form"
                componentId={addPick.componentId}
                busy={saving}
                embedActions
                onCancel={() => {
                  setAddOpen(false);
                  setAddPick(null);
                }}
                onSubmit={handleCreate}
              />
            ) : (
              <p className="text-sm text-muted">
                Select a system / component to continue.
              </p>
            )}
          </div>
        </Sheet>
      )}

      {editTarget && (
        <Sheet
          title="Edit schedule"
          onClose={() => setEditTarget(null)}
        >
          <p className="mb-3 text-xs text-muted">
            {(() => {
              const meta = componentMeta.get(editTarget.componentId);
              return meta
                ? `${meta.systemName} · ${meta.componentName}`
                : null;
            })()}
          </p>
          <ScheduleForm
            key={editTarget.id}
            formId="schedule-edit-form"
            componentId={editTarget.componentId}
            initial={editTarget}
            busy={saving}
            embedActions
            submitLabel="Save changes"
            onCancel={() => setEditTarget(null)}
            onSubmit={handleEdit}
          />
        </Sheet>
      )}
    </div>
  );
}
