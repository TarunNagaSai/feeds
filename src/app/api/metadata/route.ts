import { hashId } from "@/lib/crawler/util";
import { youtubeId } from "@/lib/video";

// Resolves a pasted URL into the fields needed to store it as a feed item:
// a stable id (same hash the crawler uses, so a later crawl of the same URL
// merges instead of duplicating), title, lead image, and a short summary.
// Powers the "add a link" box on the Saved page. Public, like /api/read.
export const runtime = "nodejs";

// A real browser UA: some hosts (Medium-backed blogs, YouTube) 403 bot
// user-agents but serve a browser one. Matches /api/read + /api/thumbnail.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Allow only public http(s) URLs. Blocks localhost and private/reserved IP
 * ranges to limit SSRF. Mirrors the guard in `/api/read`.
 */
function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.includes(":")
  ) {
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

/** Pull a meta tag's content by property/name, case-insensitively. */
function metaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return undefined;
}

/** Decode the handful of HTML entities that show up in titles/descriptions. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&hellip;|&#8230;/gi, "…")
    .replace(/&#\d+;/g, " ")
    .trim();
}

/** `<title>…</title>` text, if present. */
function titleTag(html: string): string | undefined {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m?.[1] ? decodeEntities(m[1].replace(/\s+/g, " ")) : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !isPublicHttpUrl(url)) {
    return Response.json({ ok: false, error: "Invalid or disallowed URL." }, { status: 400 });
  }

  const ytId = youtubeId(url);
  let title: string | undefined;
  let image: string | undefined;
  let summary: string | undefined;
  let finalUrl = url;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
    }).finally(() => clearTimeout(timer));
    finalUrl = res.url || url;
    if (res.ok && (res.headers.get("content-type") ?? "").includes("html")) {
      const html = (await res.text()).slice(0, 200_000);
      title =
        metaContent(html, "og:title") ??
        metaContent(html, "twitter:title") ??
        titleTag(html);
      const rawImg =
        metaContent(html, "og:image") ??
        metaContent(html, "twitter:image") ??
        metaContent(html, "twitter:image:src");
      if (rawImg) {
        try {
          image = new URL(rawImg, finalUrl).toString();
        } catch {
          /* ignore unparsable image URL */
        }
      }
      summary =
        metaContent(html, "og:description") ??
        metaContent(html, "twitter:description") ??
        metaContent(html, "description");
    }
  } catch {
    // Page unreachable / timed out — fall back to bare-URL defaults below.
  }

  // YouTube: oEmbed is reliable for the title/thumbnail even when the watch
  // page serves a consent interstitial to datacenter IPs.
  if (ytId) {
    if (!image) image = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    if (!title || title === "youtube.com" || title === "youtu.be") {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const o = await fetch(
          `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${ytId}`
          )}`,
          { signal: ctrl.signal }
        ).finally(() => clearTimeout(timer));
        if (o.ok) {
          const data = (await o.json()) as { title?: string };
          if (data.title) title = data.title;
        }
      } catch {
        /* oEmbed unavailable — keep the host fallback. */
      }
    }
  }

  return Response.json({
    ok: true,
    id: hashId(url),
    kind: ytId ? "video" : "blog",
    title: title || new URL(finalUrl).hostname.replace(/^www\./, ""),
    image: image ?? null,
    summary: summary ?? null,
    source: new URL(finalUrl).hostname.replace(/^www\./, ""),
  });
}
