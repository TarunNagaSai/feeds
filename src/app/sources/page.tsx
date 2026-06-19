"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  Rss,
  Trash2,
} from "lucide-react";
import type { Category, Source, SourceType } from "@/types";
import { cn } from "@/lib/cn";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useCategories, useSources } from "@/hooks/useData";
import { deleteSource, toggleSource } from "@/lib/db";
import { byId, colorOf } from "@/lib/category";
import { timeAgo } from "@/lib/format";
import { SourceForm } from "@/components/SourceForm";
import { Button } from "@/components/ui/Button";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/Spinner";

const TYPE_LABEL: Record<SourceType, string> = {
  rss: "RSS",
  youtube_channel: "YouTube",
  youtube_search: "YouTube search",
  hn_search: "Hacker News",
};

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors",
        on ? "bg-accent" : "border border-border bg-surface-2"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
          on ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function SourceRow({
  source,
  onEdit,
  onDelete,
}: {
  source: Source;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const enabled = source.enabled !== false;
  const value = source.url ?? source.channelId ?? source.query ?? "";
  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <Switch
        on={enabled}
        onClick={() => toggleSource(source.id, !enabled).catch(() => {})}
      />
      <div className={cn("min-w-0 flex-1", !enabled && "opacity-50")}>
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-medium">{source.name}</h4>
          <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
            {TYPE_LABEL[source.type]}
          </span>
        </div>
        <p className="truncate text-xs text-muted">{value}</p>
        <div className="mt-0.5 text-[11px]">
          {source.lastError ? (
            <span
              className="inline-flex items-center gap-1 text-danger"
              title={source.lastError}
            >
              <AlertCircle className="size-3" />
              {source.lastError}
            </span>
          ) : source.lastFetchedAt ? (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="size-3" />
              {source.lastItemCount ?? 0} items · {timeAgo(source.lastFetchedAt)}
            </span>
          ) : (
            <span className="text-muted">Not crawled yet</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={onEdit}
          className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label={`Edit ${source.name}`}
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={onDelete}
          className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          aria-label={`Delete ${source.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

export default function SourcesPage() {
  const { items: categories } = useCategories();
  const { items: sources, loading } = useSources();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [defaultCat, setDefaultCat] = useState<string | undefined>(undefined);
  const [confirm, setConfirm] = useState<Source | null>(null);

  const catsById = useMemo(() => byId(categories), [categories]);

  // Group sources under their category (preserving category order), plus orphans.
  const groups = useMemo(() => {
    const byCat = new Map<string, Source[]>();
    for (const s of sources) {
      const arr = byCat.get(s.categoryId) ?? [];
      arr.push(s);
      byCat.set(s.categoryId, arr);
    }
    const ordered: { category: Category | null; sources: Source[] }[] = [];
    for (const c of categories) {
      const list = byCat.get(c.id);
      if (list?.length) ordered.push({ category: c, sources: list });
    }
    const orphans = sources.filter((s) => !catsById.has(s.categoryId));
    if (orphans.length) ordered.push({ category: null, sources: orphans });
    return ordered;
  }, [sources, categories, catsById]);

  function openNew() {
    setEditing(null);
    setDefaultCat(categories[0]?.id);
    setFormOpen(true);
  }
  function openNewIn(categoryId: string) {
    setEditing(null);
    setDefaultCat(categoryId);
    setFormOpen(true);
  }
  function openEdit(s: Source) {
    setEditing(s);
    setFormOpen(true);
  }

  const heading = (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sources</h1>
        <p className="text-sm text-muted">
          Where the crawler pulls content from.
        </p>
      </div>
      {isFirebaseConfigured && categories.length > 0 && (
        <Button onClick={openNew}>
          <Plus className="size-4" />
          New
        </Button>
      )}
    </div>
  );

  if (!isFirebaseConfigured) {
    return (
      <div>
        {heading}
        <ConfigNotice />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {heading}
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div>
      {heading}

      {categories.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="Add a category first"
          description="Sources belong to a category. Create one, then add sources to it."
        />
      ) : sources.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="No sources yet"
          description="Add a blog feed, a YouTube channel, or a search to start pulling content."
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" />
              New source
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map(({ category, sources: list }) => {
            const col = colorOf(category?.color);
            return (
              <section key={category?.id ?? "orphans"}>
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: col.dot }}
                    />
                    <h2 className="text-sm font-semibold">
                      {category?.name ?? "Other"}
                    </h2>
                    <span className="text-xs text-muted">{list.length}</span>
                  </div>
                  {category && (
                    <button
                      onClick={() => openNewIn(category.id)}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                      Add
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {list.map((s) => (
                    <SourceRow
                      key={s.id}
                      source={s}
                      onEdit={() => openEdit(s)}
                      onDelete={() => setConfirm(s)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <SourceForm
        open={formOpen}
        initial={editing}
        categories={categories}
        defaultCategoryId={defaultCat}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={`Delete "${confirm?.name}"?`}
        message="The crawler will stop pulling from this source. Existing items stay until they age out."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirm) deleteSource(confirm.id).catch(() => {});
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
