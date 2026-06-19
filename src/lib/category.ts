import { CATEGORY_COLORS, type Category, type CategoryColor } from "@/types";

/** Color token triplet for a category, defaulting to slate. */
export function colorOf(color?: CategoryColor) {
  return CATEGORY_COLORS[color ?? "slate"] ?? CATEGORY_COLORS.slate;
}

/** Index categories by id for O(1) lookup. */
export function byId(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

/** Find a category by its slug. */
export function bySlug(
  categories: Category[],
  slug: string
): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
