import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Category, CrawlMeta, FeedItem, Source } from "@/types";
import { DEFAULT_CATEGORIES } from "../defaults";
import { getAdminDb, resolveOwnerUid } from "./admin";
import {
  fetchRssItems,
  fetchYouTubeChannelItems,
  hackerNewsUrl,
  type RawItem,
} from "./rss";
import { fetchYouTubeSearch } from "./youtube";
import { matchCategories, scoreRelevance } from "./score";
import { clean, hashId, pool, union } from "./util";

/** Items older than this (and not saved) are pruned on each live crawl. */
const MAX_AGE_DAYS = 45;
const CONCURRENCY = 5;
const PER_SOURCE_MAX = 12;

export interface CrawlOptions {
  /** Crawl the default sources and write public/sample-data.json (no Firebase). */
  demo?: boolean;
  /** Reserved: force-refresh even recently fetched sources (currently always on). */
  force?: boolean;
  ownerUid?: string;
  log?: (msg: string) => void;
}

export interface CrawlResult {
  added: number;
  updated: number;
  sources: number;
  errors: number;
  durationMs: number;
  demo: boolean;
  /** Populated only in demo mode (for sample-data.json / inspection). */
  items?: FeedItem[];
  categories?: Category[];
}

/** Dispatch a single source to the right fetcher. */
async function fetchSource(src: Source): Promise<RawItem[]> {
  switch (src.type) {
    case "rss":
      return src.url ? fetchRssItems(src.url, PER_SOURCE_MAX) : [];
    case "youtube_channel":
      return src.channelId
        ? fetchYouTubeChannelItems(src.channelId, PER_SOURCE_MAX)
        : [];
    case "youtube_search":
      return src.query ? fetchYouTubeSearch(src.query, 8) : [];
    case "hn_search":
      return src.query ? fetchRssItems(hackerNewsUrl(src.query), PER_SOURCE_MAX) : [];
    default:
      return [];
  }
}

/** Build in-memory categories + sources from the seed list (demo mode). */
function buildDemo(): { categories: Category[]; sources: Source[] } {
  const now = Date.now();
  const categories: Category[] = [];
  const sources: Source[] = [];
  DEFAULT_CATEGORIES.forEach((c, ci) => {
    const id = c.slug;
    categories.push({
      id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      keywords: c.keywords,
      color: c.color,
      icon: c.icon,
      priority: c.priority,
      order: ci,
      createdAt: now,
      updatedAt: now,
    });
    c.sources.forEach((s, si) => {
      sources.push({
        id: `${id}-${si}`,
        type: s.type,
        name: s.name,
        categoryId: id,
        url: s.url,
        channelId: s.channelId,
        query: s.query,
        enabled: true,
        order: si,
        createdAt: now,
        updatedAt: now,
      });
    });
  });
  return { categories, sources };
}

async function writeDemoFile(categories: Category[], items: FeedItem[]) {
  const out = path.resolve(process.cwd(), "public", "sample-data.json");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(
    out,
    JSON.stringify({ generatedAt: Date.now(), categories, items }, null, 2)
  );
}

/**
 * The crawl. Reads categories + sources (from Firebase, or the seed list in demo
 * mode), fetches every enabled source concurrently, scores each item against its
 * category's keywords, de-duplicates by URL hash, and writes the results —
 * preserving read/saved/hidden flags on items that already exist.
 */
export async function runCrawl(opts: CrawlOptions = {}): Promise<CrawlResult> {
  const log = opts.log ?? (() => {});
  const start = Date.now();

  // 1. Load categories + sources (+ existing items for live merges).
  let categories: Category[];
  let sources: Source[];
  let existing: Record<string, FeedItem> = {};
  let uid = "";

  if (opts.demo) {
    ({ categories, sources } = buildDemo());
    log(`Demo mode: ${sources.length} default sources, ${categories.length} categories.`);
  } else {
    const db = getAdminDb();
    uid = opts.ownerUid || (await resolveOwnerUid());
    const base = db.ref(`users/${uid}`);
    const [cSnap, sSnap, iSnap] = await Promise.all([
      base.child("categories").get(),
      base.child("sources").get(),
      base.child("items").get(),
    ]);
    categories = Object.values((cSnap.val() ?? {}) as Record<string, Category>);
    sources = Object.values((sSnap.val() ?? {}) as Record<string, Source>);
    existing = (iSnap.val() ?? {}) as Record<string, FeedItem>;
    if (!categories.length || !sources.length) {
      throw new Error(
        "No categories/sources for the owner. Open the app and sign in once to seed them (or run `npm run crawl:demo`)."
      );
    }
    log(`Owner ${uid}: ${sources.length} sources, ${categories.length} categories.`);
  }

  const catById = new Map(categories.map((c) => [c.id, c]));
  const enabled = sources.filter((s) => s.enabled !== false);

  // 2. Fetch every source concurrently; score + dedupe as results arrive.
  const collected = new Map<string, FeedItem>();
  const srcStatus = new Map<
    string,
    { lastFetchedAt: number; lastItemCount: number; lastError: string | null }
  >();
  let errors = 0;

  await pool(enabled, CONCURRENCY, async (src) => {
    const cat = catById.get(src.categoryId);
    try {
      const raw = await fetchSource(src);
      let count = 0;
      for (const r of raw) {
        if (!r.url || !r.title) continue;
        const id = hashId(r.url);
        const summary = r.summary ?? "";
        const relevance = cat
          ? scoreRelevance(r.title, summary, cat.keywords)
          : 0.5;
        const categoryIds = matchCategories(
          r.title,
          summary,
          categories,
          src.categoryId
        );
        const item: FeedItem = {
          id,
          kind: r.kind,
          title: r.title,
          url: r.url,
          summary: r.summary,
          thumbnail: r.thumbnail,
          author: r.author,
          source: src.name,
          sourceId: src.id,
          sourceType: src.type,
          categoryId: src.categoryId,
          categoryIds,
          publishedAt: r.publishedAt || start,
          fetchedAt: start,
          relevance,
          views: r.views,
          durationSeconds: r.durationSeconds,
          channelTitle: r.channelTitle,
        };
        const prev = collected.get(id);
        if (prev) {
          item.relevance = Math.max(prev.relevance, relevance);
          item.categoryIds = union(prev.categoryIds, categoryIds);
          item.thumbnail = item.thumbnail ?? prev.thumbnail;
        }
        collected.set(id, item);
        count++;
      }
      srcStatus.set(src.id, {
        lastFetchedAt: start,
        lastItemCount: count,
        lastError: null,
      });
      log(`  ✓ ${src.name}: ${count} items`);
    } catch (e) {
      errors++;
      const msg = e instanceof Error ? e.message : String(e);
      srcStatus.set(src.id, {
        lastFetchedAt: start,
        lastItemCount: 0,
        lastError: msg,
      });
      log(`  ✗ ${src.name}: ${msg}`);
    }
  });

  // 3. Persist.
  let added = 0;
  let updated = 0;

  if (opts.demo) {
    const items = [...collected.values()].sort(
      (a, b) => b.publishedAt - a.publishedAt
    );
    await writeDemoFile(categories, items);
    log(`Wrote ${items.length} items → public/sample-data.json`);
    return {
      added: items.length,
      updated: 0,
      sources: enabled.length,
      errors,
      durationMs: Date.now() - start,
      demo: true,
      items,
      categories,
    };
  }

  const db = getAdminDb();
  const base = `users/${uid}`;
  const payload: Record<string, unknown> = {};

  for (const item of collected.values()) {
    const ex = existing[item.id];
    if (ex) {
      // Preserve engagement + the original publish time across re-crawls.
      item.read = ex.read;
      item.saved = ex.saved;
      item.hidden = ex.hidden;
      if (ex.publishedAt) item.publishedAt = ex.publishedAt;
      updated++;
    } else {
      added++;
    }
    payload[`${base}/items/${item.id}`] = clean(item as unknown as Record<string, unknown>);
  }

  for (const [sid, st] of srcStatus) {
    payload[`${base}/sources/${sid}/lastFetchedAt`] = st.lastFetchedAt;
    payload[`${base}/sources/${sid}/lastItemCount`] = st.lastItemCount;
    payload[`${base}/sources/${sid}/lastError`] = st.lastError;
  }

  // Prune stale, unsaved items so the DB stays lean.
  const cutoff = start - MAX_AGE_DAYS * 86_400_000;
  for (const [id, it] of Object.entries(existing)) {
    if (collected.has(id) || it.saved) continue;
    if ((it.publishedAt || it.fetchedAt || 0) < cutoff) {
      payload[`${base}/items/${id}`] = null;
    }
  }

  const meta: CrawlMeta = {
    at: start,
    added,
    updated,
    sources: enabled.length,
    errors,
    durationMs: Date.now() - start,
  };
  payload[`${base}/meta/lastCrawl`] = meta;

  await db.ref().update(payload);
  log(`Done: +${added} new, ~${updated} updated, ${errors} source errors.`);

  return {
    added,
    updated,
    sources: enabled.length,
    errors,
    durationMs: Date.now() - start,
    demo: false,
  };
}
