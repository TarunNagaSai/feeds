import type { Category, FeedItem } from "@/types";

const HALF_LIFE_DAYS = 7;

/** 1.0 at age 0, 0.5 at 7 days, decaying smoothly. Keeps the feed fresh. */
export function recencyScore(publishedAt: number, now = Date.now()): number {
  const ageDays = Math.max(0, (now - publishedAt) / 86_400_000);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

/** Category priority 1/2/3 → multiplier 1.0 / 1.5 / 2.0 (growth bias). */
export function priorityWeight(priority = 1): number {
  const p = Math.max(1, Math.min(3, priority));
  return 1 + 0.5 * (p - 1);
}

/**
 * Final ranking score for "Top Picks". Combines content relevance (computed at
 * crawl time), freshness (computed now, so ranking stays current without a
 * re-crawl), category priority, and a gentle popularity nudge for videos.
 */
export function rankScore(
  item: FeedItem,
  category?: Category,
  now = Date.now()
): number {
  const relevance = item.relevance ?? 0.5;
  const recency = recencyScore(item.publishedAt || item.fetchedAt || now, now);
  const priority = priorityWeight(category?.priority);
  const viewsBoost = item.views
    ? 1 + Math.min(0.3, Math.log10(item.views + 1) / 30)
    : 1;
  return relevance * recency * priority * viewsBoost;
}
