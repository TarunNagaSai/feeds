import { get, ref, serverTimestamp, update } from "firebase/database";
import { getDb, userPath } from "./firebase";
import { newKey } from "./ids";
import { DEFAULT_CATEGORIES, SEED_VERSION } from "./defaults";
import type { Category, Source } from "@/types";

/** Strip undefined fields — Realtime Database rejects them. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

export interface SeedResult {
  skipped: boolean;
  categories: number;
  sources: number;
}

/**
 * Seed the starter categories + sources (tuned to the owner's growth path) in a
 * single atomic write. No-op once the account is at the current SEED_VERSION,
 * unless `force` is passed — which wipes existing categories/sources (but never
 * items or engagement) so a reseed is clean.
 */
export async function seedDefaults(opts?: { force?: boolean }): Promise<SeedResult> {
  const db = getDb();

  if (!opts?.force) {
    const snap = await get(ref(db, userPath("meta/seededVersion")));
    if ((snap.val() ?? 0) >= SEED_VERSION) {
      return { skipped: true, categories: 0, sources: 0 };
    }
  }

  const now = serverTimestamp() as unknown as number;
  const payload: Record<string, unknown> = {};

  if (opts?.force) {
    payload[userPath("categories")] = null;
    payload[userPath("sources")] = null;
  }

  let categoryCount = 0;
  let sourceCount = 0;

  DEFAULT_CATEGORIES.forEach((c, ci) => {
    const cId = newKey(db, userPath("categories"));
    const category: Category = clean({
      id: cId,
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
    payload[userPath(`categories/${cId}`)] = category;
    categoryCount++;

    c.sources.forEach((s, si) => {
      const sId = newKey(db, userPath("sources"));
      const source: Source = clean({
        id: sId,
        type: s.type,
        name: s.name,
        categoryId: cId,
        url: s.url,
        channelId: s.channelId,
        query: s.query,
        enabled: true,
        order: si,
        createdAt: now,
        updatedAt: now,
      });
      payload[userPath(`sources/${sId}`)] = source;
      sourceCount++;
    });
  });

  payload[userPath("meta/seededVersion")] = SEED_VERSION;

  await update(ref(db), payload);
  return { skipped: false, categories: categoryCount, sources: sourceCount };
}
