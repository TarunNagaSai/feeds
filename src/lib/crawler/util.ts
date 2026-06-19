import { createHash } from "node:crypto";

export const USER_AGENT =
  "Mozilla/5.0 (compatible; GrowthFeedBot/1.0; +https://github.com/TarunNagaSai)";

/**
 * A real browser UA. Some hosts — notably YouTube's `feeds/videos.xml`, which
 * throttles datacenter IPs — reply with 5xx to bot UAs but serve a browser one.
 */
export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Transient failures worth a retry: rate-limits and server-side errors. */
function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

interface FetchOpts {
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Extra attempts after the first on transient failures (default 2). */
  retries?: number;
}

/**
 * `fetch` with a per-attempt timeout, redirect following, and retry-with-backoff
 * on transient failures (429/5xx and network/abort errors). Returns the raw body
 * text alongside the response so callers can parse error bodies themselves.
 */
async function request(
  url: string,
  opts: FetchOpts & { defaultHeaders?: Record<string, string> } = {}
): Promise<{ res: Response; text: string }> {
  const retries = opts.retries ?? 2;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          ...opts.defaultHeaders,
          ...opts.headers,
        },
      });
      const text = await res.text();
      if (!res.ok && isTransientStatus(res.status) && attempt < retries) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(300 * 2 ** attempt + Math.random() * 200); // backoff + jitter
        continue;
      }
      return { res, text };
    } catch (e) {
      // Network error / timeout abort — retry if attempts remain.
      lastErr = e;
      if (attempt < retries) {
        await sleep(300 * 2 ** attempt + Math.random() * 200);
        continue;
      }
      throw e instanceof Error ? e : new Error(String(e));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Request failed");
}

/** Fetch text with a timeout, retries, and redirect following. */
export async function fetchText(
  url: string,
  opts: FetchOpts = {}
): Promise<string> {
  const { res, text } = await request(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return text;
}

/** Fetch + parse JSON, surfacing API error messages where possible. */
export async function fetchJson<T>(
  url: string,
  opts: FetchOpts = {}
): Promise<T> {
  const { res, text } = await request(url, {
    ...opts,
    defaultHeaders: { Accept: "application/json" },
  });
  if (!res.ok) {
    // Try to pull a useful message out of a JSON error body.
    let message = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j.error?.message) message = j.error.message;
    } catch {
      // Non-JSON error body — fall back to the status code.
    }
    throw new Error(message);
  }
  return JSON.parse(text) as T;
}

/** Drop tracking params and fragments so the same article hashes consistently. */
export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = "";
    for (const p of [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "mc_cid", "mc_eid", "ref", "ref_src", "source",
    ]) {
      url.searchParams.delete(p);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return input.trim();
  }
}

/** Stable short id for an item, derived from its (normalized) URL. */
export function hashId(url: string): string {
  return createHash("sha1").update(normalizeUrl(url)).digest("hex").slice(0, 20);
}

/** Strip HTML tags + decode the handful of entities feeds actually use. */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/gi, "'")
    .replace(/&hellip;|&#8230;/gi, "…")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate to n chars on a soft boundary with an ellipsis. */
export function truncate(s: string, n = 240): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

/** First <img src> found in an HTML blob, if any. */
export function firstImage(html?: string | null): string | undefined {
  if (!html) return undefined;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m?.[1];
}

/** Parse a date string to epoch ms; falls back to `fallback` on failure. */
export function toEpoch(value?: string | null, fallback = Date.now()): number {
  if (!value) return fallback;
  const t = Date.parse(value);
  return Number.isNaN(t) ? fallback : t;
}

/** Narrow an unknown to a trimmed non-empty string, else undefined. */
export function asStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Union two id lists, de-duplicated, preserving order. */
export function union(a?: string[], b?: string[]): string[] {
  return [...new Set([...(a ?? []), ...(b ?? [])])];
}

/** Run `worker` over `items` with bounded concurrency. Never rejects. */
export async function pool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, queue.length)) },
    async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item === undefined) break;
        try {
          await worker(item);
        } catch {
          // worker is expected to handle its own errors; swallow as a safety net.
        }
      }
    }
  );
  await Promise.all(runners);
}

/** Strip undefined values — Realtime Database rejects them. */
export function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}
