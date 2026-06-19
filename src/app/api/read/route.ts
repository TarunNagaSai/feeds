import { extract } from "@extractus/article-extractor";
import sanitizeHtml from "sanitize-html";

// Fetches + extracts a readable article server-side (avoids browser CORS) and
// returns sanitized HTML for the in-app reader. Node runtime, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UA =
  "Mozilla/5.0 (compatible; GrowthFeedBot/1.0; +https://github.com/TarunNagaSai)";

/**
 * Allow only public http(s) URLs. Blocks localhost and private/reserved IP
 * ranges to limit SSRF. (DNS-rebinding isn't covered — acceptable for a
 * single-user app; the feed only ever passes real article URLs here.)
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
    host.includes(":") // bracketed IPv6
  ) {
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

/** Strict allowlist sanitizer for third-party article HTML. */
function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "figure",
      "figcaption",
      "h1",
      "h2",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
      a: ["href", "name", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !isPublicHttpUrl(url)) {
    return Response.json(
      { ok: false, error: "Invalid or disallowed URL." },
      { status: 400 }
    );
  }
  try {
    const article = await extract(url, {}, { headers: { "user-agent": UA } });
    if (!article?.content) {
      return Response.json(
        { ok: false, error: "Couldn't extract a readable article from this page." },
        { status: 422 }
      );
    }
    return Response.json({
      ok: true,
      title: article.title ?? null,
      author: article.author ?? null,
      published: article.published ?? null,
      image: article.image ?? null,
      content: cleanHtml(article.content),
      link: article.url ?? url,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Extraction failed." },
      { status: 500 }
    );
  }
}
