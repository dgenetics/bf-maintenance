"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button, Input } from "./ui";

export function PinGate({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Incorrect PIN");
        setPin("");
        return;
      }
      onSuccess();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full bg-forest-100 p-3 text-forest-900">
            <Lock className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
            Beausoleil Farm
          </p>
          <h1 className="mt-1 text-lg font-semibold text-ink">
            Maintenance access
          </h1>
          <p className="mt-1 text-sm text-muted">
            Enter the farm PIN to continue
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            className="text-center text-lg tracking-[0.35em]"
            aria-label="Access PIN"
          />
          {error && (
            <p className="text-center text-xs font-medium text-red-700">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !pin.trim()}
          >
            {busy ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return children;
}
