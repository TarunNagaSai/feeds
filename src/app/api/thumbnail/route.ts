// Fetches a page's lead image server-side (avoids browser CORS) for blogs whose
// feed didn't carry a thumbnail. Returns a single absolute image URL, if found.
// Cached at the edge for a day since lead images rarely change.
export const runtime = "nodejs";
export const revalidate = 86400;

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
  // Match `<meta ... property="og:image" ... content="...">` in either attr order.
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

/** Find the best lead image in a page's HTML: og/twitter image, else first <img>. */
function leadImage(html: string): string | undefined {
  return (
    metaContent(html, "og:image") ??
    metaContent(html, "twitter:image") ??
    metaContent(html, "twitter:image:src") ??
    /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1] ??
    undefined
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !isPublicHttpUrl(url)) {
    return Response.json({ ok: false, image: null }, { status: 400 });
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
    }).finally(() => clearTimeout(timer));
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) {
      return Response.json({ ok: true, image: null });
    }
    // Only read the head-ish portion — lead images live near the top.
    const html = (await res.text()).slice(0, 200_000);
    const raw = leadImage(html);
    const image = raw ? new URL(raw, res.url || url).toString() : null;
    return Response.json(
      { ok: true, image },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch {
    return Response.json({ ok: true, image: null });
  }
}
