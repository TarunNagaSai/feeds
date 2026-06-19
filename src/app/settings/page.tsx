"use client";

import { useState } from "react";
import {
  Clock,
  Database,
  LogOut,
  RefreshCw,
  RotateCcw,
  Settings as SettingsIcon,
} from "lucide-react";
import { ALLOWED_EMAIL } from "@/lib/access";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, useCrawlMeta, useSources } from "@/hooks/useData";
import { useItems } from "@/hooks/useItems";
import { useRefreshFeed } from "@/hooks/useRefresh";
import { seedDefaults } from "@/lib/seed";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { items: categories } = useCategories();
  const { items: sources } = useSources();
  const { items } = useItems();
  const { data: meta } = useCrawlMeta();
  const { refresh, busy, status } = useRefreshFeed();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function reset() {
    setResetMsg("Resetting…");
    try {
      const r = await seedDefaults({ force: true });
      setResetMsg(`Restored ${r.categories} categories, ${r.sources} sources.`);
    } catch (e) {
      setResetMsg(e instanceof Error ? e.message : "Reset failed.");
    }
    setTimeout(() => setResetMsg(null), 6000);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Account, crawling, and automation.</p>
      </div>

      {!isFirebaseConfigured ? (
        <Section icon={SettingsIcon} title="Set up your live feed">
          <div className="space-y-3 text-sm text-muted">
            <p>
              You&apos;re in preview mode with sample data. To make it yours —
              sign-in, saving, category management, and live crawls — connect
              Firebase:
            </p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Create a Firebase project, enable{" "}
                <span className="text-foreground">Realtime Database</span> and{" "}
                <span className="text-foreground">Google</span> sign-in.
              </li>
              <li>
                Copy{" "}
                <code className="font-mono text-foreground">
                  .env.local.example
                </code>{" "}
                → <code className="font-mono text-foreground">.env.local</code>{" "}
                and fill in the web config + a service account
                (FIREBASE_SERVICE_ACCOUNT_B64).
              </li>
              <li>
                Paste{" "}
                <code className="font-mono text-foreground">
                  database.rules.json
                </code>{" "}
                into the RTDB rules, then restart the dev server.
              </li>
              <li>
                Run{" "}
                <code className="font-mono text-foreground">npm run crawl</code>{" "}
                to populate your feed.
              </li>
            </ol>
            <p>
              Meanwhile, regenerate the preview anytime with{" "}
              <code className="font-mono text-foreground">
                npm run crawl:demo
              </code>
              .
            </p>
          </div>
        </Section>
      ) : (
        <>
          <Section icon={SettingsIcon} title="Account">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user?.email ?? ALLOWED_EMAIL}
                </p>
                <p className="text-xs text-muted">Signed in · owner</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => signOut()}>
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </Section>

          <Section icon={Clock} title="Feed status">
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Categories" value={categories.length} />
              <Stat label="Sources" value={sources.length} />
              <Stat label="Recent items" value={items.length} />
            </div>
            <p className="mt-3 text-xs text-muted">
              {meta
                ? `Last crawl ${timeAgo(meta.at)} · +${meta.added} new, ~${meta.updated} updated, ${meta.errors} source error${meta.errors === 1 ? "" : "s"}.`
                : "No crawl has run yet."}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={refresh} disabled={busy}>
                {busy ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
                Refresh now
              </Button>
              {status && <span className="text-xs text-muted">{status}</span>}
            </div>
          </Section>

          <Section icon={Database} title="Automate crawling">
            <p className="text-sm text-muted">
              Schedule a recurring crawl by hitting the protected endpoint with
              your <code className="font-mono text-foreground">CRON_SECRET</code>:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-surface-2 p-3 text-xs leading-relaxed">
              <code className="font-mono">
                {`curl -X POST \\
  -H "Authorization: Bearer $CRON_SECRET" \\
  https://<your-host>/api/cron/crawl`}
              </code>
            </pre>
            <p className="mt-2 text-sm text-muted">
              On Vercel, add a Cron Job (e.g. every 6 hours) to{" "}
              <code className="font-mono text-foreground">/api/cron/crawl</code>.
              Locally, run{" "}
              <code className="font-mono text-foreground">npm run crawl</code>.
            </p>
          </Section>

          <Section icon={RotateCcw} title="Reset">
            <p className="text-sm text-muted">
              Restore the default growth-focused categories and sources. Your
              saved items and read history are kept.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" onClick={() => setResetOpen(true)}>
                <RotateCcw className="size-4" />
                Reset to defaults
              </Button>
              {resetMsg && <span className="text-xs text-muted">{resetMsg}</span>}
            </div>
          </Section>
        </>
      )}

      <ConfirmDialog
        open={resetOpen}
        title="Reset to defaults?"
        message="This replaces your current categories and sources with the defaults. Saved items and read history are not affected."
        confirmLabel="Reset"
        onConfirm={reset}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}
