import type { Category, CrawlMeta, Source } from "@/types";
import { useList } from "./useList";
import { useValue } from "./useValue";

/** Live categories (sorted by order), scoped to the signed-in owner. */
export const useCategories = () => useList<Category>("categories");

/** Live sources (sorted by order), scoped to the signed-in owner. */
export const useSources = () => useList<Source>("sources");

/** Metadata about the most recent crawl. */
export const useCrawlMeta = () => useValue<CrawlMeta>("meta/lastCrawl");
