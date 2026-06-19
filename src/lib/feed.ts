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

/** Target share of the feed that should be videos; the rest are blogs/repos. */
export const VIDEO_RATIO = 0.3;

/**
 * Reorder an already-ranked list so videos make up about `videoRatio` of it
 * (default 30%) and blogs/repos the rest — keeping YouTube from swamping the
 * feed. Rank order is preserved within each kind, and the two are interleaved to
 * track the target ratio at every position (so the mix holds even after a
 * `.slice(n)`). If one kind runs out, the remainder is appended in rank order,
 * so a video-light (or video-only) category still fills naturally.
 */
export function mixByKind(
  items: FeedItem[],
  videoRatio = VIDEO_RATIO
): FeedItem[] {
  const videos: FeedItem[] = [];
  const rest: FeedItem[] = [];
  for (const it of items) (it.kind === "video" ? videos : rest).push(it);
  if (!videos.length || !rest.length) return items;

  const out: FeedItem[] = [];
  let vi = 0;
  let bi = 0;
  while (vi < videos.length || bi < rest.length) {
    if (vi >= videos.length) {
      out.push(rest[bi++]);
    } else if (bi >= rest.length) {
      out.push(videos[vi++]);
    } else {
      // Pick whichever placement keeps the running video share nearest target.
      const slot = out.length + 1;
      const errIfVideo = Math.abs((vi + 1) / slot - videoRatio);
      const errIfBlog = Math.abs(vi / slot - videoRatio);
      if (errIfVideo < errIfBlog) out.push(videos[vi++]);
      else out.push(rest[bi++]);
    }
  }
  return out;
}
