import { fetchJson, stripHtml, toEpoch, truncate } from "./util";
import type { RawItem } from "./rss";

/** True when a YouTube Data API key is configured (enables search sources). */
export function hasYouTubeApi(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

interface YTSearchResponse {
  items?: { id?: { videoId?: string }; snippet?: YTSnippet }[];
}
interface YTSnippet {
  title?: string;
  description?: string;
  channelTitle?: string;
  publishedAt?: string;
  thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
}
interface YTVideosResponse {
  items?: {
    id: string;
    statistics?: { viewCount?: string };
    contentDetails?: { duration?: string };
  }[];
}

/** ISO-8601 duration ("PT1H2M3S") → seconds. */
function parseISODuration(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return undefined;
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0);
}

/**
 * Interest-matched YouTube search via the Data API v3. Returns recent (≤45d)
 * videos, enriched with view counts and durations for ranking. Returns an empty
 * list (no throw) when no API key is set so the crawl degrades gracefully.
 */
export async function fetchYouTubeSearch(
  query: string,
  max = 8
): Promise<RawItem[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  const publishedAfter = new Date(
    Date.now() - 45 * 24 * 60 * 60 * 1000
  ).toISOString();
  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(max),
    order: "relevance",
    q: query,
    relevanceLanguage: "en",
    publishedAfter,
    key,
  });
  const search = await fetchJson<YTSearchResponse>(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
  );
  const ids = (search.items ?? [])
    .map((i) => i.id?.videoId)
    .filter((v): v is string => Boolean(v));
  if (!ids.length) return [];

  // Enrich with stats + duration (cheap: 1 quota unit vs 100 for search).
  const stats = new Map<string, { views?: number; duration?: number }>();
  try {
    const detailParams = new URLSearchParams({
      part: "statistics,contentDetails",
      id: ids.join(","),
      key,
    });
    const detail = await fetchJson<YTVideosResponse>(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams.toString()}`
    );
    for (const v of detail.items ?? []) {
      stats.set(v.id, {
        views: v.statistics?.viewCount ? +v.statistics.viewCount : undefined,
        duration: parseISODuration(v.contentDetails?.duration),
      });
    }
  } catch {
    // Stats are a nice-to-have; ranking still works without them.
  }

  const out: RawItem[] = [];
  for (const item of search.items ?? []) {
    const id = item.id?.videoId;
    const sn = item.snippet;
    if (!id || !sn?.title) continue;
    const enriched = stats.get(id);
    out.push({
      kind: "video",
      title: sn.title,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail:
        sn.thumbnails?.high?.url ??
        sn.thumbnails?.medium?.url ??
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      channelTitle: sn.channelTitle,
      author: sn.channelTitle,
      summary: sn.description ? truncate(stripHtml(sn.description), 200) : undefined,
      publishedAt: toEpoch(sn.publishedAt),
      views: enriched?.views,
      durationSeconds: enriched?.duration,
    });
  }
  return out;
}
