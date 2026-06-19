import { runCrawl } from "@/lib/crawler";

// Crawling uses firebase-admin + network fetches: Node runtime, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled crawl endpoint. Protected by CRON_SECRET — intended for Vercel Cron
 * or a manual curl:
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://<host>/api/cron/crawl
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return Response.json(
      { ok: false, error: "Unauthorized. Set CRON_SECRET and pass it as a Bearer token." },
      { status: 401 }
    );
  }
  try {
    const logs: string[] = [];
    const result = await runCrawl({ log: (m) => logs.push(m) });
    return Response.json({ ok: true, ...result, logs });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
