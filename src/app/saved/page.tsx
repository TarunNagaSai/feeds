"use client";

import { useMemo } from "react";
import { Bookmark } from "lucide-react";
import { useFeed } from "@/hooks/useFeed";
import { byId } from "@/lib/category";
import { CategoryChips } from "@/components/CategoryChips";
import { FeedGrid } from "@/components/FeedGrid";
import { PreviewBanner } from "@/components/PreviewBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/Spinner";

export default function SavedPage() {
  const { categories, items, loading, preview } = useFeed();
  const catsById = useMemo(() => byId(categories), [categories]);
  const saved = useMemo(
    () =>
      items
        .filter((i) => i.saved && !i.hidden)
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)),
    [items]
  );

  if (loading) return <LoadingScreen />;

  return (
    <div>
      {preview && <PreviewBanner />}
      <CategoryChips categories={categories} active="saved" />

      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Bookmark className="size-4" />
        </span>
        <h1 className="text-lg font-bold tracking-tight">Saved</h1>
        <span className="text-sm text-muted">
          {saved.length} item{saved.length === 1 ? "" : "s"}
        </span>
      </div>

      {saved.length ? (
        <FeedGrid items={saved} categoriesById={catsById} preview={preview} />
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Tap the bookmark on any card to keep it here for later."
        />
      )}
    </div>
  );
}
