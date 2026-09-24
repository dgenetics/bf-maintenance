"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "./ui";

type Mode = "signin" | "register";

export function AuthGate({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path =
        mode === "signin" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "signin"
          ? { email, password }
          : { name, email, password };
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          data.error ||
            (mode === "signin" ? "Invalid email or password" : "Could not create account"),
        );
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
        <div className="mb-5 text-center">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
            Beausoleil Farm
          </p>
          <h1 className="mt-1 text-lg font-semibold text-ink">
            {mode === "signin" ? "Sign in" : "Get started"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "signin"
              ? "Use the same email and password as AiEA"
              : "Creates your shared AiEA account"}
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Name
              </label>
              <Input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Name"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Email
            </label>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              aria-label="Email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Password{mode === "register" ? " (8+ chars)" : ""}
            </label>
            <Input
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
            />
          </div>
          {error && (
            <p className="text-center text-xs font-medium text-red-700">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={
              busy ||
              !email.trim() ||
              !password.trim() ||
              (mode === "register" && !name.trim())
            }
          >
            {busy
              ? mode === "signin"
                ? "Signing in…"
                : "Creating…"
              : mode === "signin"
                ? "Sign in"
                : "Get started"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                className="font-medium text-forest-900 underline-offset-2 hover:underline"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Get started
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-forest-900 underline-offset-2 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
