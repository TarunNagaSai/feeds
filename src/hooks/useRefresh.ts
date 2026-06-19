"use client";

import { useState } from "react";
import { useAuth } from "./useAuth";

interface RefreshState {
  refresh: () => Promise<void>;
  busy: boolean;
  status: string | null;
}

/**
 * Triggers an on-demand crawl via POST /api/crawl, authenticated with the
 * owner's Firebase ID token. Surfaces a short-lived status string for the UI.
 */
export function useRefreshFeed(): RefreshState {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    if (!user || busy) return;
    setBusy(true);
    setStatus("Refreshing…");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as {
        ok?: boolean;
        added?: number;
        updated?: number;
        errors?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || "Crawl failed");
      setStatus(`+${json.added ?? 0} new · ${json.updated ?? 0} updated`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 6000);
    }
  }

  return { refresh, busy, status };
}
