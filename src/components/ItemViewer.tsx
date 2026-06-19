"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AlertCircle,
  Bookmark,
  Check,
  ExternalLink,
  EyeOff,
  StickyNote,
  X,
} from "lucide-react";
import type { Category, FeedItem } from "@/types";
import { cn } from "@/lib/cn";
import { colorOf } from "@/lib/category";
import { compactNumber, formatDuration, hostOf, timeAgo } from "@/lib/format";
import { hideItem, markRead, setItemNote, toggleSaved } from "@/lib/db";
import { youtubeEmbedUrl, youtubeId } from "@/lib/video";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Input";
import { Spinner } from "./ui/Spinner";

interface ActiveItem {
  item: FeedItem;
  category?: Category;
  preview?: boolean;
}

interface ViewerContext {
  open: (item: FeedItem, category?: Category, preview?: boolean) => void;
}

const Ctx = createContext<ViewerContext | null>(null);

export function useItemViewer(): ViewerContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useItemViewer must be used within ItemViewerProvider");
  return ctx;
}

/**
 * Holds the currently-open item and renders the in-app viewer modal once, so any
 * FeedCard can open a video player / article reader without its own modal.
 */
export function ItemViewerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveItem | null>(null);
  const open = useCallback(
    (item: FeedItem, category?: Category, preview?: boolean) =>
      setActive({ item, category, preview }),
    []
  );
  const close = useCallback(() => setActive(null), []);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {active && (
        <ItemModal
          key={active.item.id}
          item={active.item}
          category={active.category}
          preview={active.preview}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  );
}

interface ReaderData {
  ok: boolean;
  title: string | null;
  author: string | null;
  published: string | null;
  image: string | null;
  content: string;
  link: string;
}

function ItemModal({
  item,
  category,
  preview,
  onClose,
}: ActiveItem & { onClose: () => void }) {
  const isVideo = item.kind === "video";
  const videoId = isVideo ? youtubeId(item.url) : null;
  const color = colorOf(category?.color);
  const [saved, setSaved] = useState(Boolean(item.saved));

  // Lock body scroll + close on Escape, like the Sheet modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Mark read on open.
  useEffect(() => {
    if (!preview && !item.read) markRead(item.id).catch(() => {});
  }, [preview, item.read, item.id]);

  function onToggleSave() {
    const next = !saved;
    setSaved(next);
    toggleSaved(item.id, next).catch(() => setSaved(!next));
  }
  function onHide() {
    hideItem(item.id).catch(() => {});
    onClose();
  }

  const noteEditor = preview ? null : <NoteEditor item={item} />;

  const actionBar = (
    <div className="flex flex-wrap items-center gap-2">
      {!preview && (
        <>
          <Button
            size="sm"
            variant={saved ? "primary" : "secondary"}
            onClick={onToggleSave}
          >
            <Bookmark className={cn("size-4", saved && "fill-current")} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button size="sm" variant="secondary" onClick={onHide}>
            <EyeOff className="size-4" />
            Hide
          </Button>
        </>
      )}
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-foreground hover:bg-border/40"
      >
        <ExternalLink className="size-4" />
        {isVideo ? "Open on YouTube" : "Open original"}
      </a>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 animate-[fadeIn_120ms_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        className="relative z-10 flex max-h-screen w-full max-w-3xl flex-col border-border bg-surface shadow-2xl sm:max-h-[92vh] sm:rounded-2xl sm:border"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: color.dot }}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted">
            {category?.name ? `${category.name} · ` : ""}
            {isVideo ? item.channelTitle || item.source : hostOf(item.url)}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isVideo ? (
            <VideoBody
              item={item}
              videoId={videoId}
              actionBar={actionBar}
              noteEditor={noteEditor}
            />
          ) : (
            <ReaderBody
              item={item}
              actionBar={actionBar}
              noteEditor={noteEditor}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function VideoBody({
  item,
  videoId,
  actionBar,
  noteEditor,
}: {
  item: FeedItem;
  videoId: string | null;
  actionBar: React.ReactNode;
  noteEditor: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {videoId ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={item.title}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
          Inline playback isn&apos;t available for this video.
        </div>
      )}

      <h1 className="text-xl font-bold leading-snug">{item.title}</h1>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span>{item.channelTitle || item.source}</span>
        {item.publishedAt ? (
          <>
            <span aria-hidden>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </>
        ) : null}
        {item.views ? (
          <>
            <span aria-hidden>·</span>
            <span>{compactNumber(item.views)} views</span>
          </>
        ) : null}
        {item.durationSeconds ? (
          <>
            <span aria-hidden>·</span>
            <span>{formatDuration(item.durationSeconds)}</span>
          </>
        ) : null}
      </div>

      {actionBar}

      {noteEditor}

      {item.summary && (
        <p className="whitespace-pre-line border-t border-border pt-4 text-sm leading-relaxed text-muted">
          {item.summary}
        </p>
      )}
    </div>
  );
}

function ReaderBody({
  item,
  actionBar,
  noteEditor,
}: {
  item: FeedItem;
  actionBar: React.ReactNode;
  noteEditor: React.ReactNode;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: ReaderData | null;
  }>({ loading: true, error: null, data: null });

  useEffect(() => {
    // ReaderBody is keyed/remounted per item, so initial state is already
    // "loading" — no synchronous reset needed here.
    let active = true;
    fetch(`/api/read?url=${encodeURIComponent(item.url)}`)
      .then((r) => r.json())
      .then((j: ReaderData & { error?: string }) => {
        if (!active) return;
        if (j.ok) setState({ loading: false, error: null, data: j });
        else
          setState({
            loading: false,
            error: j.error || "Couldn't load this article.",
            data: null,
          });
      })
      .catch(() => {
        if (active)
          setState({
            loading: false,
            error: "Couldn't load this article.",
            data: null,
          });
      });
    return () => {
      active = false;
    };
  }, [item.url]);

  const title = state.data?.title || item.title;
  const author = state.data?.author;

  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {author && <span>{author}</span>}
        {author && <span aria-hidden>·</span>}
        <span>{item.source || hostOf(item.url)}</span>
        {item.publishedAt ? (
          <>
            <span aria-hidden>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </>
        ) : null}
      </div>

      {actionBar}

      {noteEditor}

      <div className="border-t border-border pt-4">
        {state.loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted">
            <Spinner className="size-5" />
            Loading article…
          </div>
        ) : state.data ? (
          <div
            className="reader-content"
            // Content is extracted server-side and sanitized with a strict
            // allowlist in /api/read before it ever reaches the client.
            dangerouslySetInnerHTML={{ __html: state.data.content }}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
              <span>
                {state.error} You can still read it at the source.
              </span>
            </div>
            {item.summary && (
              <p className="text-sm leading-relaxed text-muted">{item.summary}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Freeform note for an item, saved to RTDB. Tracks its own saved baseline
 * because the modal's `item` is a snapshot taken at open (it doesn't live-update
 * after a write), so dirty/saved state stays correct without a re-fetch.
 */
function NoteEditor({ item }: { item: FeedItem }) {
  const initial = item.note ?? "";
  const [text, setText] = useState(initial);
  const [savedText, setSavedText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = text.trim() !== savedText.trim();

  function save() {
    const value = text;
    setSaving(true);
    setItemNote(item.id, value)
      .then(() => setSavedText(value))
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-2/50 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <StickyNote className="size-4 text-muted" />
          Your notes
        </span>
        {!dirty && savedText.trim() && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Check className="size-3.5" /> Saved
          </span>
        )}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot down a takeaway, idea, or follow-up…"
        className="bg-surface"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          onClick={save}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
