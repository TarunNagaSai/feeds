import { formatDistanceToNowStrict } from "date-fns";

/** "3h ago", "2d ago" — compact relative time. Empty for falsy timestamps. */
export function timeAgo(ts: number | undefined | null): string {
  if (!ts) return "";
  try {
    return formatDistanceToNowStrict(new Date(ts), { addSuffix: true })
      .replace(" seconds", "s")
      .replace(" second", "s")
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" months", "mo")
      .replace(" month", "mo")
      .replace(" years", "y")
      .replace(" year", "y");
  } catch {
    return "";
  }
}

/** Bare hostname of a URL, without the leading "www." — e.g. "martinfowler.com". */
export function hostOf(url: string | undefined | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Format a YouTube duration in seconds as "12:05" or "1:02:33". */
export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Compact count: 1200 → "1.2K", 3_400_000 → "3.4M". */
export function compactNumber(n: number | undefined | null): string {
  if (n == null) return "";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`;
}
