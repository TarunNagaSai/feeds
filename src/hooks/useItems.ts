"use client";

import {
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
} from "firebase/database";
import { useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/cache";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { FeedItem } from "@/types";
import { useAuth } from "./useAuth";
import { useMounted } from "./useMounted";

/** Newest-first by publish time (UI ordering), reused for cache + live data. */
function byNewest(map: Record<string, FeedItem>): FeedItem[] {
  return Object.values(map).sort(
    (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)
  );
}

export interface ItemsState {
  items: FeedItem[];
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to the most recently fetched feed items (newest `limit`, ordered by
 * fetch time via an `.indexOn` in database.rules.json), returned newest-first by
 * publish time. Filtering/grouping/ranking happens in the page components.
 */
export function useItems(limit = 500): ItemsState {
  const mounted = useMounted();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<ItemsState>({
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!mounted) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isFirebaseConfigured || !uid) {
      setState({ items: [], loading: false, error: null });
      return;
    }
    // Hydrate from the last-known items so the feed paints instantly; the live
    // listener below reconciles it. No spinner when we already have something.
    const cachePath = `users/${uid}/items:${limit}`;
    const cached = readCache<Record<string, FeedItem>>(cachePath);
    const cachedItems = cached ? byNewest(cached) : [];
    setState({ items: cachedItems, loading: cachedItems.length === 0, error: null });
    /* eslint-enable react-hooks/set-state-in-effect */
    const q = query(
      ref(getDb(), `users/${uid}/items`),
      orderByChild("fetchedAt"),
      limitToLast(limit)
    );
    const unsub = onValue(
      q,
      (snap) => {
        const val = (snap.val() ?? {}) as Record<string, FeedItem>;
        writeCache(cachePath, val);
        setState({ items: byNewest(val), loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err }))
    );
    return () => unsub();
  }, [mounted, uid, limit]);

  return state;
}
