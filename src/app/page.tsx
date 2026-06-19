"use client";

import { useMemo } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useFeed } from "@/hooks/useFeed";
import { byId } from "@/lib/category";
import { inCategory, mixByKind, notHidden, rankAll } from "@/lib/feed";
import { CategoryChips } from "@/components/CategoryChips";
import { CategorySection } from "@/components/CategorySection";
import { FeedGrid } from "@/components/FeedGrid";
import { PreviewBanner } from "@/components/PreviewBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/Spinner";

const TOP_PICKS_COUNT = 9;
const PER_CATEGORY_COUNT = 3;

export default function HomePage() {
  const { categories, items, loading, preview } = useFeed();

  const catsById = useMemo(() => byId(categories), [categories]);
  const visible = useMemo(() => notHidden(items), [items]);
  const topPicks = useMemo(
    () => mixByKind(rankAll(visible, catsById)).slice(0, TOP_PICKS_COUNT),
    [visible, catsById]
  );

  if (loading) return <LoadingScreen />;

  return (
    <div>
      {preview && <PreviewBanner />}
      <CategoryChips categories={categories} active="top" />

      {visible.length === 0 ? (
        <EmptyState
          icon={preview ? Sparkles : RefreshCw}
          title="Your feed is empty"
          description={
            preview
              ? "The sample data couldn't load. Run `npm run crawl:demo` to regenerate it."
              : "Hit Refresh to crawl your sources, or run `npm run crawl` from the project."
          }
        />
      ) : (
        <>
          <section className="mb-9">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-lg font-bold tracking-tight">Top Picks</h2>
              <span className="text-sm text-muted">
                ranked across every category
              </span>
            </div>
            <FeedGrid
              items={topPicks}
              categoriesById={catsById}
              preview={preview}
            />
          </section>

          {categories.map((cat) => {
            const list = mixByKind(
              rankAll(inCategory(visible, cat.id), catsById)
            ).slice(0, PER_CATEGORY_COUNT);
            if (!list.length) return null;
            return (
              <CategorySection
                key={cat.id}
                category={cat}
                items={list}
                categoriesById={catsById}
                preview={preview}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
