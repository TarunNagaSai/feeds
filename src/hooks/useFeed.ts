"use client";

import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { Category, FeedItem } from "@/types";
import { useCategories } from "./useData";
import { useItems } from "./useItems";

export interface FeedData {
  categories: Category[];
  items: FeedItem[];
  loading: boolean;
  /** True when reading the bundled sample data (Firebase not configured). */
  preview: boolean;
}

interface SampleFile {
  categories?: Category[];
  items?: FeedItem[];
}

/** Load bundled sample data for the offline preview (no Firebase). */
function usePreview(enabled: boolean) {
  const [data, setData] = useState<{
    categories: Category[];
    items: FeedItem[];
    loading: boolean;
  }>({ categories: [], items: [], loading: enabled });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch("/sample-data.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no sample"))))
      .then((j: SampleFile) => {
        if (active) {
          setData({
            categories: j.categories ?? [],
            items: j.items ?? [],
            loading: false,
          });
        }
      })
      .catch(() => {
        if (active) setData({ categories: [], items: [], loading: false });
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return data;
}

/**
 * Unified feed source. Returns live Firebase data for the owner, or the bundled
 * sample data when Firebase isn't configured (so the UI is viewable instantly).
 * All three underlying hooks are always called to keep hook order stable.
 */
export function useFeed(): FeedData {
  const live = isFirebaseConfigured;
  const cats = useCategories();
  const items = useItems();
  const preview = usePreview(!live);

  if (live) {
    return {
      categories: cats.items,
      items: items.items,
      loading: cats.loading || items.loading,
      preview: false,
    };
  }
  return {
    categories: preview.categories,
    items: preview.items,
    loading: preview.loading,
    preview: true,
  };
}
