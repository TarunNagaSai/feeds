import { push, ref, type Database } from "firebase/database";
import type { ID } from "@/types";

/** Generate a new Firebase push key for the given collection path. */
export function newKey(db: Database, path: string): ID {
  const key = push(ref(db, path)).key;
  if (!key) throw new Error(`Failed to generate key for ${path}`);
  return key;
}

/**
 * Convert a Firebase keyed map into a sorted array. Sorts by `order` when
 * present, falling back to `createdAt`, then key.
 */
export function toSortedArray<T extends { order?: number; createdAt?: number }>(
  map: Record<string, T> | null | undefined
): T[] {
  if (!map) return [];
  return Object.values(map).sort((a, b) => {
    const ao = a.order ?? a.createdAt ?? 0;
    const bo = b.order ?? b.createdAt ?? 0;
    return ao - bo;
  });
}

/** Slugify a category name into a URL-safe, lowercase identifier. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "topic";
}
