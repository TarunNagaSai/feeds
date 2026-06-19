/**
 * Append a single seed category (and its sources) to the owner's live RTDB
 * subtree — without touching any existing categories, sources, items, or
 * engagement. Idempotent: skips if a category with the same slug already exists.
 *
 *   npm run add-category -- agentic-ai
 *
 * The slug must match one defined in `src/lib/defaults.ts` (DEFAULT_CATEGORIES),
 * so the category data stays single-sourced. Reads env from .env.local.
 */
import { ServerValue } from "firebase-admin/database";
import { getAdminDb, resolveOwnerUid } from "../src/lib/crawler/admin";
import { DEFAULT_CATEGORIES, SEED_VERSION } from "../src/lib/defaults";
import type { Category, Source } from "../src/types";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    throw new Error("Usage: npm run add-category -- <slug>");
  }
  const def = DEFAULT_CATEGORIES.find((c) => c.slug === slug);
  if (!def) {
    throw new Error(
      `No default category with slug "${slug}". Known: ${DEFAULT_CATEGORIES.map((c) => c.slug).join(", ")}`
    );
  }

  const db = getAdminDb();
  const uid = await resolveOwnerUid();
  const base = `users/${uid}`;

  // Bail if the category already exists (idempotent re-runs).
  const catsSnap = await db.ref(`${base}/categories`).get();
  const cats = (catsSnap.val() ?? {}) as Record<string, Category>;
  const existing = Object.values(cats).find((c) => c.slug === slug);
  if (existing) {
    console.log(`↩︎  Category "${def.name}" (${slug}) already exists — nothing to do.`);
    return;
  }

  const now = ServerValue.TIMESTAMP as unknown as number;
  // Place the new category after all current ones.
  const order =
    Object.values(cats).reduce((m, c) => Math.max(m, c.order ?? 0), -1) + 1;

  const cId = db.ref(`${base}/categories`).push().key!;
  const payload: Record<string, unknown> = {};

  const category: Category = {
    id: cId,
    name: def.name,
    slug: def.slug,
    description: def.description,
    keywords: def.keywords,
    color: def.color,
    icon: def.icon,
    priority: def.priority,
    order,
    createdAt: now,
    updatedAt: now,
  };
  payload[`${base}/categories/${cId}`] = category;

  def.sources.forEach((s, si) => {
    const sId = db.ref(`${base}/sources`).push().key!;
    const source: Source = {
      id: sId,
      type: s.type,
      name: s.name,
      categoryId: cId,
      ...(s.url ? { url: s.url } : {}),
      ...(s.channelId ? { channelId: s.channelId } : {}),
      ...(s.query ? { query: s.query } : {}),
      enabled: true,
      order: si,
      createdAt: now,
      updatedAt: now,
    };
    payload[`${base}/sources/${sId}`] = source;
  });

  // Record the account as current with the latest SEED_VERSION so the client's
  // auto-seed (AppShell) doesn't re-seed and duplicate every category on next visit.
  payload[`${base}/meta/seededVersion`] = SEED_VERSION;

  await db.ref().update(payload);
  console.log(
    `✅ Added category "${def.name}" with ${def.sources.length} sources for uid ${uid}.`
  );
  console.log("   Run `npm run crawl` to populate it with content.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
