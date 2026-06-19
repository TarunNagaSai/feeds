import type { Category, FeedItem } from "@/types";
import { rankScore } from "./rank";

/** Drop items the owner has hidden. */
export function notHidden(items: FeedItem[]): FeedItem[] {
  return items.filter((i) => !i.hidden);
}

/** Items whose primary or cross-listed category matches `categoryId`. */
export function inCategory(items: FeedItem[], categoryId: string): FeedItem[] {
  return items.filter(
    (i) =>
      i.categoryId === categoryId || (i.categoryIds ?? []).includes(categoryId)
  );
}

/** Sort a copy of `items` by ranking score (relevance × freshness × priority). */
export function rankAll(
  items: FeedItem[],
  categoriesById: Map<string, Category>,
  now = Date.now()
): FeedItem[] {
  return [...items].sort(
    (a, b) =>
      rankScore(b, categoriesById.get(b.categoryId), now) -
      rankScore(a, categoriesById.get(a.categoryId), now)
  );
}
