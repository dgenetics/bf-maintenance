"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { maintenanceApi } from "@/lib/api";
import type { TaskJson } from "@/lib/maintenance";
import { useData } from "@/context/DataContext";
import { StatusBadge } from "@/components/maintenance/TaskCard";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";

export function Archive() {
  const { assets } = useData();
  const [tasks, setTasks] = useState<TaskJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemId, setSystemId] = useState("all");
  const [componentId, setComponentId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const componentMeta = useMemo(() => {
    const map = new Map<
      string,
      { systemId: string; systemName: string; componentName: string }
    >();
    for (const s of assets) {
      for (const c of s.components) {
        map.set(c.id, {
          systemId: s.id,
          systemName: s.name,
          componentName: c.name,
        });
      }
    }
    return map;
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

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        const meta = componentMeta.get(t.componentId);
        if (systemId !== "all" && meta?.systemId !== systemId) return false;
        if (componentId !== "all" && t.componentId !== componentId) return false;
        if (fromDate) {
          const done = t.completedAt ?? t.dueDate;
          if (done.slice(0, 10) < fromDate) return false;
        }
        if (toDate) {
          const done = t.completedAt ?? t.dueDate;
          if (done.slice(0, 10) > toDate) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aa = a.completedAt ?? a.updatedAt;
        const bb = b.completedAt ?? b.updatedAt;
        return bb.localeCompare(aa);
      });
  }, [tasks, componentMeta, systemId, componentId, fromDate, toDate]);

  return (
    <div className="space-y-4">
      <Link
        to="/maintenance"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Board
      </Link>

      <PageHeader
        title="Archive"
        subtitle={`${filtered.length} completed task${filtered.length === 1 ? "" : "s"}`}
      />

      <Card className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={systemId}
            aria-label="Filter by system"
            onChange={(e) => {
              setSystemId(e.target.value);
              setComponentId("all");
            }}
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
          <Select
            value={componentId}
            aria-label="Filter by component"
            onChange={(e) => setComponentId(e.target.value)}
          >
            <option value="all">All components</option>
            {componentsForSystem.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="Completed from"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="Completed to"
          />
        </div>
        {(systemId !== "all" ||
          componentId !== "all" ||
          fromDate ||
          toDate) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSystemId("all");
              setComponentId("all");
              setFromDate("");
              setToDate("");
            }}
          >
            Clear filters
          </Button>
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
        <p className="text-sm text-muted">No completed tasks match.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const meta = componentMeta.get(t.componentId);
            return (
              <li key={t.id}>
                <Card className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{t.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {meta
                        ? `${meta.systemName} · ${meta.componentName}`
                        : "Unknown component"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t.completedAt
                        ? `Done ${format(parseISO(t.completedAt), "MMM d, yyyy")}`
                        : `Due was ${format(parseISO(t.dueDate), "MMM d, yyyy")}`}
                    </p>
                    {t.completedNotes && (
                      <p className="mt-1 text-sm text-muted">
                        {t.completedNotes}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
