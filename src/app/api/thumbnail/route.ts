import { extract } from "@extractus/article-extractor";

// Resolves a representative image for a blog whose feed carried no thumbnail.
// Uses the same article extractor as /api/read to pick the article's real lead
// image (ignoring nav logos / avatars), with an og:image fallback. Returns a
// single absolute image URL, if found. Cached a day since lead images rarely
// change. Public, like /api/read, so it works in preview mode too.
export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (compatible; GrowthFeedBot/1.0; +https://github.com/TarunNagaSai)";

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
    if (m?.[1]) return m[1];
  }
  return undefined;
}

/** Fallback: scrape an og/twitter image straight from the page HTML. */
async function ogImage(url: string): Promise<string | undefined> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
    }).finally(() => clearTimeout(timer));
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) {
      return undefined;
    }
    const html = (await res.text()).slice(0, 200_000);
    const raw =
      metaContent(html, "og:image") ??
      metaContent(html, "twitter:image") ??
      metaContent(html, "twitter:image:src");
    return raw ? new URL(raw, res.url || url).toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !isPublicHttpUrl(url)) {
    return Response.json({ ok: false, image: null }, { status: 400 });
  }

  let image: string | null = null;
  try {
    // Primary: the article extractor picks the post's real lead image and skips
    // nav logos / avatars that naive <img> scraping would grab.
    const article = await extract(url, {}, { headers: { "user-agent": UA } });
    image = article?.image ?? null;
  } catch {
    // Extraction failed (paywall, JS-only page, 4xx) — fall through to og:image.
  }
  if (!image) image = (await ogImage(url)) ?? null;

  return Response.json(
    { ok: true, image },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
}
