"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Inbox } from "lucide-react";
import { useFeed } from "@/hooks/useFeed";
import { byId, colorOf } from "@/lib/category";
import { inCategory, notHidden, rankAll } from "@/lib/feed";
import { PRIORITY_LABELS } from "@/types";
import { CategoryChips } from "@/components/CategoryChips";
import { FeedGrid } from "@/components/FeedGrid";
import { PreviewBanner } from "@/components/PreviewBanner";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/Spinner";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { categories, items, loading, preview } = useFeed();

  const catsById = useMemo(() => byId(categories), [categories]);
  const category = useMemo(
    () => categories.find((c) => c.slug === slug),
    [categories, slug]
  );
  const list = useMemo(
    () =>
      category
        ? rankAll(inCategory(notHidden(items), category.id), catsById)
        : [],
    [items, category, catsById]
  );

  if (loading) return <LoadingScreen />;

  const color = colorOf(category?.color);

  return (
    <div>
      {preview && <PreviewBanner />}
      <CategoryChips categories={categories} active={slug} />

      {!category ? (
        <EmptyState
          icon={Inbox}
          title="Category not found"
          description="It may have been removed. Pick another from the chips above."
        />
      ) : (
        <>
          <header className="mb-5 flex items-start gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: color.soft, color: color.text }}
            >
              <CategoryIcon name={category.icon} className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-0.5 text-sm text-muted">
                  {category.description}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                {list.length} item{list.length === 1 ? "" : "s"} ·{" "}
                {PRIORITY_LABELS[category.priority] ?? "Important"}
              </p>
            </div>
          </header>

          {list.length ? (
            <FeedGrid
              items={list}
              categoriesById={catsById}
              preview={preview}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="Nothing here yet"
              description="No items have matched this category's sources yet. Try a refresh, or add more sources."
            />
          )}
        </>
      )}
    </div>
  );
}
