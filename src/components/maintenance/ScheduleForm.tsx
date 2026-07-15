"use client";

import { useState } from "react";
import { FREQUENCY_OPTIONS } from "@/lib/maintenance";
import type { CreateScheduleInput } from "@/lib/api";
import { Button, Field, Input, Select, Textarea } from "../ui";

export function ScheduleForm({
  componentId,
  onSubmit,
  onCancel,
  busy,
}: {
  componentId: string;
  onSubmit: (input: CreateScheduleInput) => Promise<void> | void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("90d");
  const [customDays, setCustomDays] = useState("30");
  const [nextDueDate, setNextDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [isRecurring, setIsRecurring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!nextDueDate) {
      setError("Next due date is required");
      return;
    }

    const opt = FREQUENCY_OPTIONS.find((o) => o.value === frequency);
    let intervalDays: number | null =
      frequency === "custom"
        ? Number(customDays) || null
        : (opt?.days ?? null);

    try {
      await onSubmit({
        componentId,
        name: name.trim(),
        description: description.trim() || null,
        frequency: frequency === "custom" ? "custom" : frequency,
        intervalDays,
        isRecurring,
        nextDueDate: new Date(nextDueDate + "T12:00:00").toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <Field label="Schedule name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Oil change, Annual inspection"
          autoFocus
        />
      </Field>
      <Field label="Description">
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Frequency">
          <Select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Next due">
          <Input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        </Field>
      </div>
      {frequency === "custom" && (
        <Field label="Interval (days)">
          <Input
            inputMode="numeric"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
          />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="rounded border-cream-300"
        />
        Recurring (create next task when completed)
      </label>
      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Save schedule"}
        </Button>
      </div>
    </form>
  );
}
