import {
  get,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { getDb, userPath } from "./firebase";
import { newKey, slugify } from "./ids";
import type {
  Category,
  CategoryColor,
  FeedItem,
  ID,
  ItemKind,
  Source,
  SourceType,
} from "@/types";

/** Strip undefined fields — Realtime Database rejects `undefined` values. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

const TS = serverTimestamp() as unknown as number;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategoryInput {
  name: string;
  description?: string;
  keywords: string[];
  color: CategoryColor;
  icon?: string;
  priority: number;
}

/** Ensure a slug is unique among existing categories by suffixing -2, -3, … */
function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function createCategory(data: CategoryInput): Promise<ID> {
  const db = getDb();
  const snap = await get(ref(db, userPath("categories")));
  const existing = (snap.val() ?? {}) as Record<ID, Category>;
  const taken = new Set(Object.values(existing).map((c) => c.slug));
  const id = newKey(db, userPath("categories"));
  const entity: Category = clean({
    id,
    name: data.name.trim(),
    slug: uniqueSlug(slugify(data.name), taken),
    description: data.description?.trim() || undefined,
    keywords: normalizeKeywords(data.keywords),
    color: data.color,
    icon: data.icon,
    priority: clampPriority(data.priority),
    order: Date.now(),
    createdAt: TS,
    updatedAt: TS,
  });
  await set(ref(db, userPath(`categories/${id}`)), entity);
  return id;
}

export async function updateCategory(
  id: ID,
  patch: Partial<CategoryInput>
): Promise<void> {
  const next: Record<string, unknown> = { updatedAt: TS };
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.description !== undefined)
    next.description = patch.description.trim() || null;
  if (patch.keywords !== undefined)
    next.keywords = normalizeKeywords(patch.keywords);
  if (patch.color !== undefined) next.color = patch.color;
  if (patch.icon !== undefined) next.icon = patch.icon;
  if (patch.priority !== undefined) next.priority = clampPriority(patch.priority);
  await update(ref(getDb(), userPath(`categories/${id}`)), next);
}

export async function setCategoryOrder(ids: ID[]): Promise<void> {
  const payload: Record<string, unknown> = {};
  ids.forEach((id, i) => {
    payload[userPath(`categories/${id}/order`)] = i;
  });
  await update(ref(getDb()), payload);
}

/**
 * Delete a category along with its sources and the items it owns (cross-listed
 * items that merely *mention* it survive — they belong to another category).
 */
export async function deleteCategory(id: ID): Promise<void> {
  const db = getDb();
  const [sSnap, iSnap] = await Promise.all([
    get(ref(db, userPath("sources"))),
    get(ref(db, userPath("items"))),
  ]);
  const sources = (sSnap.val() ?? {}) as Record<ID, Source>;
  const items = (iSnap.val() ?? {}) as Record<ID, { categoryId?: ID }>;
  const payload: Record<string, unknown> = {
    [userPath(`categories/${id}`)]: null,
  };
  for (const [sid, s] of Object.entries(sources)) {
    if (s.categoryId === id) payload[userPath(`sources/${sid}`)] = null;
  }
  for (const [iid, it] of Object.entries(items)) {
    if (it.categoryId === id) payload[userPath(`items/${iid}`)] = null;
  }
  await update(ref(db), payload);
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export interface SourceInput {
  type: SourceType;
  name: string;
  categoryId: ID;
  url?: string;
  channelId?: string;
  query?: string;
}

export async function createSource(data: SourceInput): Promise<ID> {
  const db = getDb();
  const id = newKey(db, userPath("sources"));
  const entity: Source = clean({
    id,
    type: data.type,
    name: data.name.trim(),
    categoryId: data.categoryId,
    url: data.url?.trim() || undefined,
    channelId: data.channelId?.trim() || undefined,
    query: data.query?.trim() || undefined,
    enabled: true,
    order: Date.now(),
    createdAt: TS,
    updatedAt: TS,
  });
  await set(ref(db, userPath(`sources/${id}`)), entity);
  return id;
}

export async function updateSource(
  id: ID,
  patch: Partial<SourceInput & { enabled: boolean }>
): Promise<void> {
  const next: Record<string, unknown> = { updatedAt: TS };
  if (patch.type !== undefined) next.type = patch.type;
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.categoryId !== undefined) next.categoryId = patch.categoryId;
  if (patch.url !== undefined) next.url = patch.url.trim() || null;
  if (patch.channelId !== undefined) next.channelId = patch.channelId.trim() || null;
  if (patch.query !== undefined) next.query = patch.query.trim() || null;
  if (patch.enabled !== undefined) next.enabled = patch.enabled;
  await update(ref(getDb(), userPath(`sources/${id}`)), next);
}

export async function toggleSource(id: ID, enabled: boolean): Promise<void> {
  await update(ref(getDb(), userPath(`sources/${id}`)), {
    enabled,
    updatedAt: TS,
  });
}

export async function deleteSource(id: ID): Promise<void> {
  await remove(ref(getDb(), userPath(`sources/${id}`)));
}

// ---------------------------------------------------------------------------
// Item engagement (read / saved / hidden)
// ---------------------------------------------------------------------------

export async function setItemFlags(
  id: ID,
  flags: { read?: boolean; saved?: boolean; hidden?: boolean }
): Promise<void> {
  await update(ref(getDb(), userPath(`items/${id}`)), flags);
}

export const markRead = (id: ID) => setItemFlags(id, { read: true });
export const toggleSaved = (id: ID, saved: boolean) =>
  setItemFlags(id, { saved });
export const hideItem = (id: ID) => setItemFlags(id, { hidden: true });
export const unhideItem = (id: ID) => setItemFlags(id, { hidden: false });

/** Save (or clear, when blank) the owner's freeform note on an item. */
export async function setItemNote(id: ID, note: string): Promise<void> {
  await update(ref(getDb(), userPath(`items/${id}`)), {
    note: note.trim() || null,
  });
}

// ---------------------------------------------------------------------------
// Manually saved links
// ---------------------------------------------------------------------------

interface LinkMeta {
  ok: boolean;
  id: ID;
  kind: ItemKind;
  title: string;
  image: string | null;
  summary: string | null;
  source: string;
  error?: string;
}

/**
 * Add an arbitrary URL straight into Saved. Resolves its title/image/summary
 * via `/api/metadata` (which also returns the crawler-compatible id, so a later
 * crawl of the same URL merges rather than duplicates), then writes a feed item
 * flagged `saved`. If the item already exists it's just marked saved, preserving
 * any existing fields. Returns the item id.
 */
export async function addSavedLink(rawUrl: string): Promise<ID> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Enter a full http(s) URL.");
  }

  const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
  const meta = (await res.json().catch(() => null)) as LinkMeta | null;
  if (!res.ok || !meta?.ok) {
    throw new Error(meta?.error || "Couldn't read that link.");
  }

  const db = getDb();
  const path = userPath(`items/${meta.id}`);
  const existing = (await get(ref(db, path))).val() as FeedItem | null;

  if (existing) {
    // Already in the feed — just pin it to Saved (and un-hide).
    await update(ref(db, path), { saved: true, hidden: false });
    return meta.id;
  }

  const now = Date.now();
  const item: FeedItem = clean({
    id: meta.id,
    kind: meta.kind,
    title: meta.title,
    url,
    summary: meta.summary || undefined,
    thumbnail: meta.image || undefined,
    source: meta.source,
    sourceId: "manual",
    sourceType: "rss" as SourceType,
    categoryId: "",
    publishedAt: now,
    fetchedAt: now,
    relevance: 1,
    saved: true,
  });
  await set(ref(db, path), item);
  return meta.id;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function normalizeKeywords(keywords: string[]): string[] {
  return [
    ...new Set(
      keywords
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.length > 0)
    ),
  ];
}

function clampPriority(p: number): number {
  return Math.max(1, Math.min(3, Math.round(p) || 1));
}
