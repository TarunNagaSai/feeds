import { AlertTriangle } from "lucide-react";

/**
 * Shown on pages that require a live database when NEXT_PUBLIC_FIREBASE_* env
 * vars are missing, so the app explains itself instead of silently failing.
 */
export function ConfigNotice() {
  return (
    <div className="mx-auto my-6 flex max-w-xl gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
      <AlertTriangle className="size-5 shrink-0 text-danger" />
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Firebase not configured</p>
        <p className="text-muted">
          You&apos;re viewing sample data. To manage categories and sources, create
          a Firebase project, enable Realtime Database + Google sign-in, then copy
          your config into{" "}
          <code className="font-mono text-foreground">.env.local</code> (see{" "}
          <code className="font-mono text-foreground">.env.local.example</code>) and
          restart the dev server.
        </p>
      </div>
    </div>
  );
}
