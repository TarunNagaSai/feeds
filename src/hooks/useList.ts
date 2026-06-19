import { useMemo } from "react";
import type { Keyed } from "@/types";
import { toSortedArray } from "@/lib/ids";
import { useValue } from "./useValue";

export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to a Realtime Database collection and return it as a sorted array.
 * Sorts by `order` then `createdAt` (see `toSortedArray`).
 */
export function useList<T extends { order?: number; createdAt?: number }>(
  path: string | null
): ListState<T> {
  const { data, loading, error } = useValue<NonNullable<Keyed<T>>>(path);
  const items = useMemo(() => toSortedArray<T>(data), [data]);
  return { items, loading, error };
}
