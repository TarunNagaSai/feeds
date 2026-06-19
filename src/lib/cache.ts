/**
 * Lightweight localStorage cache for Realtime Database snapshots.
 *
 * The Firebase **web** SDK has no on-disk persistence (that's mobile/Firestore
 * only), so a cold load always shows a spinner while the first `onValue` round
 * trip completes. To avoid that, we mirror each snapshot into localStorage and
 * hydrate the subscription hooks' initial state from it: the UI paints the
 * last-known data instantly, then the live listener silently reconciles it.
 *
 * Everything here is best-effort and SSR-safe — any storage failure (quota,
 * private mode, server render) degrades gracefully to "no cache".
 */

const PREFIX = "feeds.cache.v1:";

function key(path: string): string {
  return PREFIX + path;
}

/** Read a cached snapshot for `path`, or `null` if absent/unreadable. */
export function readCache<T>(path: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(path));
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/** Persist a snapshot for `path`. `null`/`undefined` clears the entry. */
export function writeCache(path: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key(path));
    } else {
      window.localStorage.setItem(key(path), JSON.stringify(value));
    }
  } catch {
    // Quota exceeded or storage disabled — the live listener still works.
  }
}

/** Drop every cached entry (e.g. on sign-out). */
export function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
