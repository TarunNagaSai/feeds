"use client";

import { useEffect, useState } from "react";
import type { Category, Source, SourceType } from "@/types";
import { createSource, updateSource, type SourceInput } from "@/lib/db";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Input";
import { Sheet } from "./ui/Sheet";

interface TypeOption {
  value: SourceType;
  label: string;
  field: "url" | "channelId" | "query";
  fieldLabel: string;
  placeholder: string;
  hint: string;
  /** When true, the value field may be left blank. */
  optional?: boolean;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "rss",
    label: "RSS / Atom feed",
    field: "url",
    fieldLabel: "Feed URL",
    placeholder: "https://blog.example.com/feed",
    hint: "Any blog or newsletter feed URL.",
  },
  {
    value: "youtube_channel",
    label: "YouTube channel",
    field: "channelId",
    fieldLabel: "Channel ID",
    placeholder: "UCsBjURrPoezykLs9EqgamOA",
    hint: "The channel ID (starts with UC…). No API key needed.",
  },
  {
    value: "youtube_search",
    label: "YouTube search",
    field: "query",
    fieldLabel: "Search query",
    placeholder: "vLLM inference optimization",
    hint: "Interest-matched videos. Needs YOUTUBE_API_KEY set.",
  },
  {
    value: "hn_search",
    label: "Hacker News search",
    field: "query",
    fieldLabel: "Search query",
    placeholder: "large language model",
    hint: "High-signal Hacker News posts matching a query.",
  },
  {
    value: "github_trending",
    label: "GitHub trending",
    field: "query",
    fieldLabel: "Filter (optional)",
    placeholder: "language:rust  ·  topic:llm  ·  machine learning",
    hint: "New, fast-rising repos. Leave blank for overall trending, or narrow with text/qualifiers (language:…, topic:…).",
    optional: true,
  },
];

/** Add or edit a source. Pass `initial` to edit, omit/null to create. */
export function SourceForm({
  open,
  initial,
  categories,
  defaultCategoryId,
  onClose,
}: {
  open: boolean;
  initial?: Source | null;
  categories: Category[];
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const editing = Boolean(initial);
  const [type, setType] = useState<SourceType>("rss");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opt = TYPE_OPTIONS.find((o) => o.value === type) ?? TYPE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    // Sync form fields from props when the sheet opens — a deliberate
    // external→state sync, so the cascading-render lint rule doesn't apply.
    /* eslint-disable react-hooks/set-state-in-effect */
    setError(null);
    if (initial) {
      setType(initial.type);
      setName(initial.name);
      setCategoryId(initial.categoryId);
      setValue(initial.url ?? initial.channelId ?? initial.query ?? "");
    } else {
      setType("rss");
      setName("");
      setCategoryId(defaultCategoryId ?? categories[0]?.id ?? "");
      setValue("");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial, defaultCategoryId, categories]);

  async function save() {
    if (!name.trim()) return setError("Name is required.");
    if (!categoryId) return setError("Pick a category.");
    if (!opt.optional && !value.trim())
      return setError(`${opt.fieldLabel} is required.`);

    setBusy(true);
    setError(null);
    const input: SourceInput = {
      type,
      name,
      categoryId,
      url: opt.field === "url" ? value : undefined,
      channelId: opt.field === "channelId" ? value : undefined,
      query: opt.field === "query" ? value : undefined,
    };
    try {
      if (initial) await updateSource(initial.id, input);
      else await createSource(input);
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
      title={editing ? "Edit source" : "New source"}
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
        <Field label="Type">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as SourceType)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hugging Face Blog"
          />
        </Field>

        <Field label="Category">
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.length === 0 && <option value="">No categories</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={opt.fieldLabel} hint={opt.hint}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={opt.placeholder}
            inputMode={opt.field === "url" ? "url" : "text"}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
