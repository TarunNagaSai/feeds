"use client";

import { useState } from "react";
import { FolderCog, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { PRIORITY_LABELS, type Category } from "@/types";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useCategories, useSources } from "@/hooks/useData";
import { deleteCategory } from "@/lib/db";
import { colorOf } from "@/lib/category";
import { CategoryForm } from "@/components/CategoryForm";
import { Button } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/Spinner";

const iconBtn =
  "flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground";

export default function CategoriesPage() {
  const { items: categories, loading } = useCategories();
  const { items: sources } = useSources();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);

  const sourceCount = (id: string) =>
    sources.filter((s) => s.categoryId === id).length;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setFormOpen(true);
  }

  const heading = (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted">
          The topics your feed is organized around.
        </p>
      </div>
      {isFirebaseConfigured && (
        <Button onClick={openNew}>
          <FolderPlus className="size-4" />
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
          icon={FolderCog}
          title="No categories yet"
          description="Add a topic to start shaping your feed."
          action={
            <Button onClick={openNew}>
              <FolderPlus className="size-4" />
              New category
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {categories.map((c) => {
            const col = colorOf(c.color);
            const count = sourceCount(c.id);
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: col.soft, color: col.text }}
                >
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{c.name}</h3>
                    <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                      {PRIORITY_LABELS[c.priority] ?? "Important"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted">
                    {count} source{count === 1 ? "" : "s"} ·{" "}
                    {(c.keywords ?? []).length} keywords
                    {c.description ? ` · ${c.description}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className={iconBtn}
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setConfirm(c)}
                    className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CategoryForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={`Delete "${confirm?.name}"?`}
        message="This removes the category, its sources, and the items it owns. Saved items that also belong to other categories are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirm) deleteCategory(confirm.id).catch(() => {});
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
