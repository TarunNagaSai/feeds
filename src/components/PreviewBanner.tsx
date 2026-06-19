import Link from "next/link";
import { Info } from "lucide-react";

/** Shown on feed pages in preview mode (sample data, no Firebase configured). */
export function PreviewBanner() {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="text-muted">
        <span className="font-medium text-foreground">Preview mode.</span> Showing
        sample data from a demo crawl. Configure Firebase to sign in, save items,
        manage categories, and run live crawls —{" "}
        <Link href="/settings" className="text-accent hover:underline">
          see setup
        </Link>
        .
      </p>
    </div>
  );
}
