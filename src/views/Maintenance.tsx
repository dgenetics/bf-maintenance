"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, RefreshCw, Wrench } from "lucide-react";
import { maintenanceApi } from "@/lib/api";
import type { TaskJson } from "@/lib/maintenance";
import { useData } from "@/context/DataContext";
import { UpcomingTasks } from "@/components/maintenance/UpcomingTasks";
import { Button, PageHeader } from "@/components/ui";

export function Maintenance() {
  const { assets } = useData();
  const [tasks, setTasks] = useState<TaskJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const componentLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of assets) {
      for (const c of s.components) {
        map.set(c.id, `${s.name} · ${c.name}`);
      }
    }
    return map;
  }, [assets]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await maintenanceApi.listTasks();
      setTasks(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overdue = tasks.filter((t) => t.status === "OVERDUE");
  const dueSoon = tasks.filter((t) => t.status === "DUE_SOON");
  const upcoming = tasks.filter((t) => t.status === "PENDING");
  const completed = tasks
    .filter((t) => t.status === "COMPLETED")
    .slice(0, 8);

  async function handleComplete(task: TaskJson) {
    setBusyId(task.id);
    try {
      await maintenanceApi.completeTask(task.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(task: TaskJson) {
    setBusyId(task.id);
    try {
      await maintenanceApi.cancelTask(task.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  async function suggestAll() {
    setSuggesting(true);
    setError(null);
    setInfo(null);
    try {
      let created = 0;
      let componentsWithSchedules = 0;
      for (const s of assets) {
        for (const c of s.components) {
          const result = await maintenanceApi.suggestTasks(c.id);
          created += result.created.length;
          if (result.created.length || result.skipped.length) {
            componentsWithSchedules += 1;
          }
        }
      }
      await load();
      if (created > 0) {
        setInfo(`Created ${created} task${created === 1 ? "" : "s"}.`);
      } else if (componentsWithSchedules > 0) {
        setInfo("No new tasks — open tasks already exist for schedules.");
      } else {
        setInfo(
          "No schedules found. Open a component and add a maintenance schedule first.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suggest failed");
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Maintenance"
        subtitle="Upcoming work across systems & components"
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={suggesting || loading}
              onClick={() => void suggestAll()}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${suggesting ? "animate-spin" : ""}`}
              />
              Suggest tasks
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/">
          <Button size="sm" variant="secondary">
            <Wrench className="h-3.5 w-3.5" />
            Systems
          </Button>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => void load()}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

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

      {loading ? (
        <p className="text-sm text-muted">Loading tasks…</p>
      ) : (
        <UpcomingTasks
          overdue={overdue}
          dueSoon={dueSoon}
          upcoming={upcoming}
          completed={completed}
          subtitleFor={(t) => componentLabel.get(t.componentId)}
          onComplete={handleComplete}
          onCancel={handleCancel}
          busyId={busyId}
        />
      )}
    </div>
  );
}
