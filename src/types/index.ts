export type ID = string;

/** How a source is crawled. */
export type SourceType =
  | "rss" // any RSS/Atom feed (blogs, newsletters, YouTube channel xml)
  | "youtube_channel" // YouTube channel, fetched via its RSS feed (no API key)
  | "youtube_search" // YouTube Data API search by query (needs YOUTUBE_API_KEY)
  | "hn_search"; // Hacker News search feed (hnrss.org) by query

/** What kind of content an item is — drives card layout. */
export type ItemKind = "blog" | "video";

/**
 * A topic the feed is organized around. Categories carry the keywords the
 * crawler scores content against and a `priority` (1–3) that biases ranking so
 * the feed leans toward what matters most for growth.
 */
export interface Category {
  id: ID;
  name: string;
  /** URL-safe identifier used in routes (`/c/[slug]`). Unique per user. */
  slug: string;
  description?: string;
  /** Interest keywords used for relevance scoring + cross-listing. */
  keywords: string[];
  /** Accent color token: one of the keys in `CATEGORY_COLORS`. */
  color: CategoryColor;
  /** lucide-react icon name (see `CategoryIcon`). */
  icon?: string;
  /** 1 = nice-to-have, 2 = important, 3 = core growth area. Biases ranking. */
  priority: number;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** A place the crawler pulls content from, bound to one category. */
export interface Source {
  id: ID;
  type: SourceType;
  name: string;
  categoryId: ID;
  /** RSS/Atom URL (type "rss"). */
  url?: string;
  /** YouTube channel id, e.g. "UCsBjURrPoezykLs9EqgamOA" (type "youtube_channel"). */
  channelId?: string;
  /** Search query (types "youtube_search" / "hn_search"). */
  query?: string;
  enabled: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
  /** Crawl bookkeeping, written by the crawler. */
  lastFetchedAt?: number;
  lastError?: string | null;
  lastItemCount?: number;
}

/**
 * A single crawled piece of content. The id is a stable hash of the URL so a
 * re-crawl updates the existing item (and preserves read/saved/hidden flags)
 * instead of duplicating it.
 */
export interface FeedItem {
  id: ID;
  kind: ItemKind;
  title: string;
  url: string;
  summary?: string;
  thumbnail?: string;
  author?: string;
  /** Display name of the originating source. */
  source: string;
  sourceId: ID;
  sourceType: SourceType;
  /** Primary category (the source's category). */
  categoryId: ID;
  /** All categories this item is relevant to (includes the primary). */
  categoryIds?: ID[];
  /** Publish time (ms epoch). Falls back to fetch time when unknown. */
  publishedAt: number;
  fetchedAt: number;
  /** Content relevance to the primary category, 0–1. Used for ranking. */
  relevance: number;
  views?: number;
  durationSeconds?: number;
  channelTitle?: string;
  // ── engagement (toggled from the UI, preserved across crawls) ──
  read?: boolean;
  saved?: boolean;
  hidden?: boolean;
}

/** Summary of the most recent crawl, stored at `meta/lastCrawl`. */
export interface CrawlMeta {
  at: number;
  added: number;
  updated: number;
  sources: number;
  errors: number;
  durationMs?: number;
}

/** Shape Firebase Realtime DB returns for a collection: a keyed map or null. */
export type Keyed<T> = Record<ID, T> | null;

// ─────────────────────────────────────────────────────────────────────────────
// Presentation tokens
// ─────────────────────────────────────────────────────────────────────────────

export type CategoryColor =
  | "indigo"
  | "violet"
  | "blue"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "orange"
  | "slate";

/** Tailwind-ish hex pairs for each color token (used inline for chips/dots). */
export const CATEGORY_COLORS: Record<CategoryColor, { dot: string; soft: string; text: string }> = {
  indigo: { dot: "#6366f1", soft: "rgba(99,102,241,0.14)", text: "#818cf8" },
  violet: { dot: "#8b5cf6", soft: "rgba(139,92,246,0.14)", text: "#a78bfa" },
  blue: { dot: "#3b82f6", soft: "rgba(59,130,246,0.14)", text: "#60a5fa" },
  cyan: { dot: "#06b6d4", soft: "rgba(6,182,212,0.14)", text: "#22d3ee" },
  emerald: { dot: "#10b981", soft: "rgba(16,185,129,0.14)", text: "#34d399" },
  amber: { dot: "#f59e0b", soft: "rgba(245,158,11,0.14)", text: "#fbbf24" },
  rose: { dot: "#f43f5e", soft: "rgba(244,63,94,0.14)", text: "#fb7185" },
  orange: { dot: "#f97316", soft: "rgba(249,115,22,0.14)", text: "#fb923c" },
  slate: { dot: "#64748b", soft: "rgba(100,116,139,0.14)", text: "#94a3b8" },
};

export const CATEGORY_COLOR_OPTIONS = Object.keys(CATEGORY_COLORS) as CategoryColor[];

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Explore",
  2: "Important",
  3: "Core growth",
};
