"use client";

import { useEffect, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_OPTIONS,
  PRIORITY_LABELS,
  type Category,
  type CategoryColor,
} from "@/types";
import { cn } from "@/lib/cn";
import { createCategory, updateCategory, type CategoryInput } from "@/lib/db";
import {
  CATEGORY_ICON_OPTIONS,
  CategoryIcon,
} from "./ui/CategoryIcon";
import { Button } from "./ui/Button";
import { Field, Input, Textarea } from "./ui/Input";
import { Sheet } from "./ui/Sheet";

const PRIORITIES = [1, 2, 3];

/** Add or edit a category. Pass `initial` to edit, omit/null to create. */
export function CategoryForm({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial?: Category | null;
  onClose: () => void;
}) {
  const editing = Boolean(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CategoryColor>("indigo");
  const [icon, setIcon] = useState("Hash");
  const [priority, setPriority] = useState(2);
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Sync form fields from props when the sheet opens — a deliberate
    // external→state sync, so the cascading-render lint rule doesn't apply.
    /* eslint-disable react-hooks/set-state-in-effect */
    setError(null);
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? "");
      setColor(initial.color);
      setIcon(initial.icon ?? "Hash");
      setPriority(initial.priority);
      setKeywords((initial.keywords ?? []).join(", "));
    } else {
      setName("");
      setDescription("");
      setColor("indigo");
      setIcon("Hash");
      setPriority(2);
      setKeywords("");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial]);

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const input: CategoryInput = {
      name,
      description,
      color,
      icon,
      priority,
      keywords: keywords
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (initial) await updateCategory(initial.id, input);
      else await createCategory(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit category" : "New category"}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI & LLM Engineering"
            autoFocus
          />
        </Field>

        <Field label="Description" hint="Optional — shown on the category page.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this topic is about"
          />
        </Field>

        <Field
          label="Keywords"
          hint="Comma or newline separated. Drives relevance scoring + top picks."
        >
          <Textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="llm, fine-tuning, vllm, rag, agents"
          />
        </Field>

        <Field
          label="Priority"
          hint="Core-growth topics get pushed higher in Top Picks."
        >
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-sm font-medium transition-colors",
                  priority === p
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-muted hover:text-foreground"
                )}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  "size-8 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-foreground" : "border-transparent"
                )}
                style={{ background: CATEGORY_COLORS[c].dot }}
              />
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICON_OPTIONS.map((n) => (
              <button
                key={n}
                aria-label={n}
                onClick={() => setIcon(n)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border transition-colors",
                  icon === n
                    ? "border-accent text-accent"
                    : "border-border text-muted hover:text-foreground"
                )}
              >
                <CategoryIcon name={n} className="size-4" />
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
