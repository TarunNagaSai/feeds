import type { Category } from "@/types";

/**
 * Content relevance of an item to a category's interest keywords, 0–1.
 * Title matches count double. Starts at a 0.3 floor because the item already
 * comes from a source bound to this category — keywords refine the ranking.
 */
export function scoreRelevance(
  title: string,
  summary: string,
  keywords: string[]
): number {
  if (!keywords.length) return 0.5;
  const t = title.toLowerCase();
  const s = summary.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase().trim();
    if (!k) continue;
    if (t.includes(k)) score += 2;
    else if (s.includes(k)) score += 1;
  }
  const norm = 1 - Math.exp(-score / 4);
  return Math.min(1, 0.3 + 0.7 * norm);
}

/** Raw keyword hit counts for a category, split by where they matched. */
function hits(title: string, summary: string, keywords: string[]) {
  const t = title.toLowerCase();
  const s = summary.toLowerCase();
  let titleHits = 0;
  let summaryHits = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase().trim();
    if (!k) continue;
    if (t.includes(k)) titleHits++;
    else if (s.includes(k)) summaryHits++;
  }
  return { titleHits, summaryHits };
}

/**
 * Every category this item is relevant to (for cross-listing in other category
 * feeds). The primary category is always included and listed first; a secondary
 * category qualifies on a title keyword hit or 2+ summary hits.
 */
export function matchCategories(
  title: string,
  summary: string,
  categories: Category[],
  primaryId: string
): string[] {
  const ids = [primaryId];
  for (const cat of categories) {
    if (cat.id === primaryId) continue;
    const { titleHits, summaryHits } = hits(title, summary, cat.keywords);
    if (titleHits >= 1 || summaryHits >= 2) ids.push(cat.id);
  }
  return [...new Set(ids)];
}
