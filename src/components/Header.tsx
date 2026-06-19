"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  FolderCog,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Rss,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useRefreshFeed } from "@/hooks/useRefresh";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Feed", icon: LayoutGrid, exact: true },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/categories", label: "Categories", icon: FolderCog },
  { href: "/sources", label: "Sources", icon: Rss },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-surface-2 text-foreground"
          : "text-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4" strokeWidth={active ? 2.4 : 1.8} />
      {item.label}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { refresh, busy, status } = useRefreshFeed();
  const live = isFirebaseConfigured && Boolean(user);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Sparkles className="size-4" />
          </span>
          <span>Growth Feed</span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {status && (
            <span className="hidden max-w-[180px] truncate text-xs text-muted sm:inline">
              {status}
            </span>
          )}
          {live ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={refresh}
                disabled={busy}
                title="Crawl sources for new content"
              >
                {busy ? (
                  <Spinner className="size-4" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <button
                onClick={() => signOut()}
                title={user?.email ?? "Sign out"}
                className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
              Preview
            </span>
          )}
        </div>
      </div>

      {/* Compact nav for small screens. */}
      <nav className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-3 pb-2 lg:hidden">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </header>
  );
}
