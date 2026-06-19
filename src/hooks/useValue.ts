import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
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
    setState((s) => ({ ...s, loading: true }));
    /* eslint-enable react-hooks/set-state-in-effect */
    const r = ref(getDb(), fullPath);
    const unsub = onValue(
      r,
      (snap) => setState({ data: snap.val() as T | null, loading: false, error: null }),
      (err) => setState({ data: null, loading: false, error: err })
    );
    return () => unsub();
  }, [mounted, fullPath]);

  return state;
}
