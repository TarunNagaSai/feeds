import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/cache";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import { useMounted } from "./useMounted";

export interface ValueState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to a single Realtime Database path, scoped to the signed-in user
 * (read under `users/{uid}/…`). Pass `null` to skip the subscription.
 */
export function useValue<T>(path: string | null): ValueState<T> {
  const mounted = useMounted();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const fullPath = path !== null && uid ? `users/${uid}/${path}` : null;
  const [state, setState] = useState<ValueState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!mounted || fullPath === null) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isFirebaseConfigured) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    // Hydrate from the last-known snapshot so the UI paints instantly; the live
    // listener below reconciles it. No spinner when we already have something.
    const cached = readCache<T>(fullPath);
    setState({ data: cached, loading: cached === null, error: null });
    /* eslint-enable react-hooks/set-state-in-effect */
    const r = ref(getDb(), fullPath);
    const unsub = onValue(
      r,
      (snap) => {
        const data = snap.val() as T | null;
        writeCache(fullPath, data);
        setState({ data, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err }))
    );
    return () => unsub();
  }, [mounted, fullPath]);

  return state;
}
