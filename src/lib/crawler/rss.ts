import Parser from "rss-parser";
import type { ItemKind } from "@/types";
import {
  asStr,
  BROWSER_USER_AGENT,
  fetchText,
  firstImage,
  stripHtml,
  toEpoch,
  truncate,
} from "./util";

/** Normalized, pre-scoring shape every source fetcher returns. */
export interface RawItem {
  kind: ItemKind;
  title: string;
  url: string;
  summary?: string;
  thumbnail?: string;
  author?: string;
  publishedAt: number;
  channelTitle?: string;
  views?: number;
  durationSeconds?: number;
}

const parser = new Parser({
  timeout: 15_000,
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent"],
      ["dc:creator", "creator"],
      ["yt:videoId", "ytVideoId"],
    ],
  },
});

/** Pull a thumbnail URL out of the various places feeds hide one. */
function extractThumb(item: Record<string, unknown>): string | undefined {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && (enclosure.type ?? "").startsWith("image")) {
    return enclosure.url;
  }
  const mt = item.mediaThumbnail as { $?: { url?: string } } | undefined;
  if (mt?.$?.url) return mt.$.url;
  const mc = item.mediaContent as { $?: { url?: string; medium?: string } } | undefined;
  if (mc?.$?.url && (mc.$.medium ?? "image") === "image") return mc.$.url;
  return firstImage(asStr(item.contentEncoded) ?? asStr(item.content));
}

/** Fetch and normalize a generic RSS/Atom feed (blogs, newsletters, HN). */
export async function fetchRssItems(url: string, max = 12): Promise<RawItem[]> {
  const xml = await fetchText(url, {
    headers: {
      Accept:
        "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });
  const feed = await parser.parseString(xml);
  const out: RawItem[] = [];
  for (const it of (feed.items ?? []).slice(0, max)) {
    const r = it as unknown as Record<string, unknown>;
    const title = asStr(it.title);
    const link = asStr(it.link) ?? asStr(r.guid);
    if (!title || !link) continue;
    const summarySrc =
      asStr(it.contentSnippet) ??
      stripHtml(asStr(r.contentEncoded) ?? asStr(it.content) ?? asStr(r.summary));
    out.push({
      kind: "blog",
      title,
      url: link,
      summary: summarySrc ? truncate(summarySrc, 260) : undefined,
      thumbnail: extractThumb(r),
      author: asStr(r.creator) ?? asStr(it.creator) ?? asStr(r.author),
      publishedAt: toEpoch(it.isoDate ?? it.pubDate),
    });
  }
  return out;
}

/**
 * Fetch a YouTube channel's recent uploads via its public RSS feed (no API key
 * needed). Thumbnails are derived deterministically from the video id.
 */
export async function fetchYouTubeChannelItems(
  channelId: string,
  max = 10
): Promise<RawItem[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  // YouTube throttles datacenter IPs / bot UAs on this endpoint with 5xx, so use
  // a browser UA + Accept-Language; `fetchText` retries transient failures.
  const xml = await fetchText(url, {
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      Accept: "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const feed = await parser.parseString(xml);
  const channelTitle = asStr(feed.title);
  const out: RawItem[] = [];
  for (const it of (feed.items ?? []).slice(0, max)) {
    const r = it as unknown as Record<string, unknown>;
    let videoId = asStr(r.ytVideoId);
    if (!videoId) {
      const id = asStr(r.id) ?? asStr(r.guid); // "yt:video:VIDEOID"
      if (id?.startsWith("yt:video:")) videoId = id.slice("yt:video:".length);
    }
    if (!videoId && it.link) {
      try {
        videoId = new URL(it.link).searchParams.get("v") ?? undefined;
      } catch {
        /* ignore */
      }
    }
    const title = asStr(it.title);
    const watchUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : asStr(it.link);
    if (!title || !watchUrl) continue;
    const desc = asStr(it.contentSnippet);
    out.push({
      kind: "video",
      title,
      url: watchUrl,
      thumbnail: videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : undefined,
      channelTitle,
      author: channelTitle,
      summary: desc ? truncate(desc, 200) : undefined,
      publishedAt: toEpoch(it.isoDate ?? it.pubDate),
    });
  }
  return out;
}

/** Hacker News search feed (hnrss.org) for high-signal interest matches. */
export function hackerNewsUrl(query: string): string {
  const sp = new URLSearchParams({ q: query, points: "30", count: "20" });
  return `https://hnrss.org/newest?${sp.toString()}`;
}
