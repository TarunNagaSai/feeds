import type { Category, FeedItem } from "@/types";
import { FeedCard } from "./FeedCard";

/** Responsive grid of feed cards. */
export function FeedGrid({
  items,
  categoriesById,
  preview,
}: {
  items: FeedItem[];
  categoriesById: Map<string, Category>;
  preview?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <FeedCard
          key={item.id}
          item={item}
          category={categoriesById.get(item.categoryId)}
          preview={preview}
        />
      ))}
    </div>
  );
}
