"use client";

import {
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
} from "firebase/database";
import { useEffect, useState } from "react";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { FeedItem } from "@/types";
import { useAuth } from "./useAuth";
import { useMounted } from "./useMounted";

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
    setState((s) => ({ ...s, loading: true }));
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
        const items = Object.values(val).sort(
          (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)
        );
        setState({ items, loading: false, error: null });
      },
      (err) => setState({ items: [], loading: false, error: err })
    );
    return () => unsub();
  }, [mounted, uid, limit]);

  return state;
}
