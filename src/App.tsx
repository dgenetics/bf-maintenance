"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DataProvider, useData } from "./context/DataContext";
import { Layout } from "./components/Layout";
import { PinGate } from "./components/PinGate";
import { cleanupLegacyClient } from "./lib/cleanup-legacy";
import { AssetList } from "./views/AssetList";
import { AssetNew } from "./views/AssetNew";
import { AssetDetail } from "./views/AssetDetail";

const SW_RELOAD_KEY = "bf-sw-cleaned";

function LoadingShell() {
  const { loading, error, refresh } = useData();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-100 text-sm text-muted">
        Loading registry…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cream-100 px-4 text-center">
        <p className="text-sm font-medium text-ink">Could not load data</p>
        <p className="max-w-sm text-xs text-muted">{error}</p>
        <p className="max-w-sm text-xs text-muted">
          Use the app at{" "}
          <a
            className="underline"
            href="https://bf-maintenance.vercel.app"
          >
            bf-maintenance.vercel.app
          </a>{" "}
          or run <code className="rounded bg-cream-200 px-1">npm run dev</code>{" "}
          in BF-Maintenance (often http://localhost:3001 if 3000 is taken).
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl bg-forest-900 px-4 py-2 text-sm text-cream-50"
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AssetList />} />
        <Route path="assets" element={<Navigate to="/" replace />} />
        <Route path="assets/new" element={<AssetNew />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [authState, setAuthState] = useState<
    "checking" | "locked" | "unlocked"
  >("checking");

  // Kill old Vite PWA SW once, then hard-reload so /api isn't intercepted
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const hadSw = await cleanupLegacyClient();
        const alreadyReloaded = sessionStorage.getItem(SW_RELOAD_KEY) === "1";
        if (hadSw && !alreadyReloaded) {
          sessionStorage.setItem(SW_RELOAD_KEY, "1");
          window.location.reload();
          return;
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      setAuthState(res.ok ? "unlocked" : "locked");
    } catch {
      setAuthState("locked");
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void checkAuth();
  }, [ready, checkAuth]);

  if (!ready || authState === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-100 text-sm text-muted">
        Checking access…
      </div>
    );
  }

  if (authState === "locked") {
    return (
      <PinGate
        onSuccess={() => {
          setAuthState("unlocked");
        }}
      />
    );
  }

  return (
    <DataProvider>
      <BrowserRouter>
        <LoadingShell />
      </BrowserRouter>
    </DataProvider>
  );
}
