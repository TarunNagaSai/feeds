"use client";

import { useState } from "react";
import { Bookmark, EyeOff, MonitorPlay, Newspaper, Play } from "lucide-react";
import type { Category, FeedItem } from "@/types";
import { cn } from "@/lib/cn";
import { colorOf } from "@/lib/category";
import { compactNumber, formatDuration, hostOf, timeAgo } from "@/lib/format";
import { hideItem, markRead, toggleSaved } from "@/lib/db";
import { useItemViewer } from "./ItemViewer";
import { CategoryIcon } from "./ui/CategoryIcon";

/**
 * One piece of feed content. The whole card is a stretched link to the source
 * URL (opens in a new tab, marks the item read); save/hide actions float above
 * it. In preview mode (no Firebase) the actions are hidden.
 */
export function FeedCard({
  item,
  category,
  preview,
}: {
  item: FeedItem;
  category?: Category;
  preview?: boolean;
}) {
  const { open } = useItemViewer();
  const [imgFailed, setImgFailed] = useState(false);
  const [saved, setSaved] = useState(Boolean(item.saved));
  const color = colorOf(category?.color);
  const isVideo = item.kind === "video";
  const host = hostOf(item.url);
  const showImage = Boolean(item.thumbnail) && !imgFailed;

  function onOpen(e: React.MouseEvent) {
    // Modified / non-primary clicks fall through to the browser (open in a new
    // tab); a plain click opens the in-app reader/player instead.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      if (!preview && !item.read) markRead(item.id).catch(() => {});
      return;
    }
    e.preventDefault();
    open(item, category, preview);
  }
  function onToggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    toggleSaved(item.id, next).catch(() => setSaved(!next));
  }
  function onHide(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    hideItem(item.id).catch(() => {});
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-border/60",
        item.read && "opacity-70"
      )}
    >
      {/* Media */}
      <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            style={{ background: color.soft }}
          >
            <CategoryIcon
              name={category?.icon}
              className="size-9 opacity-60"
            />
          </div>
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Play className="size-5 translate-x-0.5 fill-white" />
            </span>
          </span>
        )}
        {isVideo && item.durationSeconds ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(item.durationSeconds)}
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {category && (
          <span
            className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: color.soft, color: color.text }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: color.dot }}
            />
            {category.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">
          {item.title}
        </h3>
        {item.summary && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">
            {item.summary}
          </p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-[11px] text-muted">
          {isVideo ? (
            <MonitorPlay className="size-3.5 shrink-0" />
          ) : (
            <Newspaper className="size-3.5 shrink-0" />
          )}
          <span className="truncate">
            {isVideo ? item.channelTitle || item.source : item.source || host}
          </span>
          {item.publishedAt ? (
            <>
              <span aria-hidden>·</span>
              <span className="shrink-0">{timeAgo(item.publishedAt)}</span>
            </>
          ) : null}
          {item.views ? (
            <>
              <span aria-hidden>·</span>
              <span className="shrink-0">
                {compactNumber(item.views)} views
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Stretched link (covers the card) */}
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onOpen}
        aria-label={item.title}
        className="absolute inset-0 z-0"
      />

      {/* Floating actions */}
      {!preview && (
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            onClick={onToggleSave}
            aria-label={saved ? "Unsave" : "Save"}
            title={saved ? "Unsave" : "Save"}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border border-border bg-surface/90 backdrop-blur-sm hover:bg-surface",
              saved ? "text-accent" : "text-muted hover:text-foreground"
            )}
          >
            <Bookmark className={cn("size-4", saved && "fill-current")} />
          </button>
          <button
            onClick={onHide}
            aria-label="Hide"
            title="Hide from feed"
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface/90 text-muted backdrop-blur-sm hover:bg-surface hover:text-foreground"
          >
            <EyeOff className="size-4" />
          </button>
        </div>
      )}

      {/* Saved indicator (always visible when saved) */}
      {saved && (
        <span className="absolute left-2 top-2 z-10 flex size-7 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-sm">
          <Bookmark className="size-3.5 fill-current" />
        </span>
      )}
    </article>
  );
}
