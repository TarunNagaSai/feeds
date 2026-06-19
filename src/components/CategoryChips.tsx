"use client";

import Link from "next/link";
import { Bookmark, Plus, Sparkles } from "lucide-react";
import type { Category } from "@/types";
import { cn } from "@/lib/cn";
import { colorOf } from "@/lib/category";

/**
 * Horizontal rail of filter chips: Top Picks · Saved · one per category · a
 * "Manage" shortcut. `active` is "top" | "saved" | a category slug.
 */
export function CategoryChips({
  categories,
  active,
  showManage = true,
}: {
  categories: Category[];
  active: string;
  showManage?: boolean;
}) {
  return (
    <div className="no-scrollbar -mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <Chip href="/" active={active === "top"}>
        <Sparkles className="size-3.5" />
        Top Picks
      </Chip>
      <Chip href="/saved" active={active === "saved"}>
        <Bookmark className="size-3.5" />
        Saved
      </Chip>
      {categories.map((c) => {
        const color = colorOf(c.color);
        const isActive = active === c.slug;
        return (
          <Chip key={c.id} href={`/c/${c.slug}`} active={isActive}>
            <span
              className="size-2 rounded-full"
              style={{ background: color.dot }}
            />
            {c.name}
          </Chip>
        );
      })}
      {showManage && (
        <Link
          href="/categories"
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Manage
        </Link>
      )}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface text-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
