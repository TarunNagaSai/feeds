import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Category, FeedItem } from "@/types";
import { colorOf } from "@/lib/category";
import { CategoryIcon } from "./ui/CategoryIcon";
import { FeedGrid } from "./FeedGrid";

/** A category's heading + a few of its top items, used on the home feed. */
export function CategorySection({
  category,
  items,
  categoriesById,
  preview,
}: {
  category: Category;
  items: FeedItem[];
  categoriesById: Map<string, Category>;
  preview?: boolean;
}) {
  const color = colorOf(category.color);
  return (
    <section className="mb-9">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: color.soft, color: color.text }}
          >
            <CategoryIcon name={category.icon} className="size-4" />
          </span>
          <h2 className="truncate text-lg font-bold tracking-tight">
            {category.name}
          </h2>
        </div>
        <Link
          href={`/c/${category.slug}`}
          className="inline-flex shrink-0 items-center gap-0.5 text-sm text-muted hover:text-foreground"
        >
          View all
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <FeedGrid
        items={items}
        categoriesById={categoriesById}
        preview={preview}
      />
    </section>
  );
}
