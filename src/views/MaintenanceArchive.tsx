"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { maintenanceApi } from "@/lib/api";
import type { TaskJson } from "@/lib/maintenance";
import { useData } from "@/context/DataContext";
import { TaskList } from "@/components/maintenance/TaskList";
import { Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";

export function MaintenanceArchive() {
  const { assets } = useData();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<TaskJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const systemId = params.get("system") ?? "all";
  const componentId = params.get("component") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

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

  const componentsForSystem = useMemo(() => {
    if (systemId === "all") {
      return assets.flatMap((s) =>
        s.components.map((c) => ({
          id: c.id,
          label: `${s.name} · ${c.name}`,
        })),
      );
    }
    const s = assets.find((a) => a.id === systemId);
    return (s?.components ?? []).map((c) => ({
      id: c.id,
      label: c.name,
    }));
  }, [assets, systemId]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await maintenanceApi.listTasks({ status: "COMPLETED" });
      setTasks(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const meta = componentMeta.get(t.componentId);
      if (systemId !== "all") {
        if (!meta || meta.systemId !== systemId) return false;
      }
      if (componentId !== "all" && t.componentId !== componentId) return false;

      const doneIso = t.completedAt ?? t.updatedAt;
      const doneDay = doneIso.slice(0, 10);
      if (from && doneDay < from) return false;
      if (to && doneDay > to) return false;
      return true;
    });
  }, [tasks, componentMeta, systemId, componentId, from, to]);

  return (
    <div className="space-y-4">
      <Link
        to="/maintenance"
        className="flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to maintenance
      </Link>

      <PageHeader
        title="Completed archive"
        subtitle={
          loading
            ? "Loading…"
            : `${filtered.length} of ${tasks.length} completed task${tasks.length === 1 ? "" : "s"}`
        }
      />

      <Card className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="System">
            <Select
              value={systemId}
              onChange={(e) => {
                const next = e.target.value;
                // Reset component when system changes
                patchParams({ system: next, component: null });
              }}
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
          <Field label="Component">
            <Select
              value={componentId}
              onChange={(e) =>
                patchParams({ component: e.target.value })
              }
              aria-label="Filter by component"
            >
              <option value="all">All components</option>
              {componentsForSystem.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Completed from">
            <Input
              type="date"
              value={from}
              onChange={(e) => patchParams({ from: e.target.value })}
              aria-label="Completed from date"
            />
          </Field>
          <Field label="Completed to">
            <Input
              type="date"
              value={to}
              onChange={(e) => patchParams({ to: e.target.value })}
              aria-label="Completed to date"
            />
          </Field>
        </div>
        {(systemId !== "all" ||
          componentId !== "all" ||
          from ||
          to) && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setParams({}, { replace: true });
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading archive…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            {tasks.length === 0
              ? "No completed tasks yet."
              : "No completed tasks match these filters."}
          </p>
        </Card>
      ) : (
        <TaskList
          tasks={filtered}
          emptyMessage=""
          subtitleFor={(t) => {
            const meta = componentMeta.get(t.componentId);
            return meta
              ? `${meta.systemName} · ${meta.componentName}`
              : undefined;
          }}
        />
      )}
    </div>
  );
}
