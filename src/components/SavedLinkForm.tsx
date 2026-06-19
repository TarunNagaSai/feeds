"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { addSavedLink } from "@/lib/db";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

/**
 * A one-field box to drop any URL straight into Saved. Resolves the link's
 * metadata server-side and writes it as a saved feed item. Live data only —
 * the Saved page hides this in preview mode.
 */
export function SavedLinkForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addSavedLink(value);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-5">
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste a link to save…"
          aria-label="Link to save"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !url.trim()} className="shrink-0">
          <Plus className="size-4" />
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </form>
  );
}
