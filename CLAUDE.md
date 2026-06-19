# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The line above is not decoration: this repo runs **Next.js 16 / React 19 /
> Tailwind v4**. APIs and conventions differ from older versions in your training
> data. Before writing framework code, read the relevant guide under
> `node_modules/next/dist/docs/` (notably `01-app/` for the App Router).

## Commands

```bash
npm run dev          # Next dev server (Turbopack) on http://localhost:3000
npm run build        # production build (also typechecks + lints — the main gate)
npm run start        # serve the production build
npm run lint         # eslint (flat config in eslint.config.mjs)
npm run crawl        # live crawl → Firebase (needs .env.local)
npm run crawl:demo   # offline crawl of default sources → public/sample-data.json
```

There is **no test runner**. Verify with `npm run build` and by exercising the UI.
Deploy RTDB rules after editing `database.rules.json`:
`firebase deploy --only database --project <project-id>`.

The `@/*` import alias maps to `src/*`. Local setup is documented in `README.md`.

## What this is

A personal feed platform: a **crawler** pulls blogs / YouTube / Hacker News matched
to interest keywords, scores them, and writes to **Firebase Realtime Database**; a
**Next.js UI** displays them by category with growth-ranked Top Picks and lets the
owner add/edit/remove categories and sources. Single-user, owner-locked.

## Owner-only app

Hard-locked to one Google account. The email comes from `NEXT_PUBLIC_OWNER_EMAIL`
(`ALLOWED_EMAIL` in `src/lib/access.ts`) — never hardcoded, since the repo is
public. Enforced in three layers:

1. **RTDB rules** (`database.rules.json`) — the real boundary; scopes everything
   to `users/{uid}` and checks the owner email. Rules can't read env vars, so the
   email is literal here (repo ships the placeholder `owner@example.com` — set your
   real one before deploying rules).
2. **Client** (`AuthProvider`, `src/hooks/useAuth.tsx`) — rejects non-owner sessions.
3. **Server** (`src/app/api/crawl/route.ts`) — verifies the Firebase ID token.

To change the owner: set `NEXT_PUBLIC_OWNER_EMAIL` (env) **and** the literal email
in your deployed `database.rules.json`.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · TypeScript (strict) · Tailwind v4 ·
Firebase Auth (Google) + Realtime Database (client) · Firebase Admin SDK (crawler).

### Two execution contexts

- **Client** (`"use client"` pages + hooks) reads/writes the owner's RTDB subtree
  via the Firebase **web** SDK. Browser-only access is gated behind `useMounted`
  so it never runs during SSR. `src/lib/firebase.ts` holds the singleton + the
  `userPath()` namespacing helper; `isFirebaseConfigured` gates everything.
- **Crawler** (`src/lib/crawler/*`) runs in Node — from the standalone script
  (`scripts/crawl.ts` via `tsx`) **and** the API routes. It uses the **Admin** SDK
  (`src/lib/crawler/admin.ts`, bypasses rules). Crawler files use **relative**
  imports for runtime and `import type` for `@/types` (so `tsx` needs no alias
  resolution). Do **not** import `"server-only"` here — it would break the script.

### Data flow (client)

1. `src/lib/firebase.ts` — SDK singleton, `userPath()`, `isFirebaseConfigured`.
2. `src/hooks/useValue.ts` / `useList.ts` / `useItems.ts` — RTDB subscriptions,
   scoped to `users/{uid}/…`. `useItems` queries the newest items by `fetchedAt`
   (`.indexOn` in `database.rules.json`).
3. `src/hooks/useData.ts` — typed `useCategories` / `useSources` / `useCrawlMeta`.
4. `src/hooks/useFeed.ts` — **unified** source: live Firebase data, or the bundled
   `public/sample-data.json` when Firebase isn't configured (preview mode). All
   underlying hooks are always called to keep hook order stable.
5. `src/lib/db.ts` — imperative mutations (categories, sources, item flags).
   `src/lib/seed.ts` seeds defaults on first sign-in (`AppShell` effect).

### The crawler (`src/lib/crawler/`)

`index.ts#runCrawl` is the orchestrator: load categories+sources (from RTDB, or
`defaults.ts` in demo mode) → fetch every enabled source with bounded concurrency
→ score relevance + cross-list categories → de-dupe by URL hash → write a single
multi-path RTDB update (preserving `read`/`saved`/`hidden`, pruning >45-day unsaved
items) → record `meta/lastCrawl`. Fetchers: `rss.ts` (RSS/Atom + YouTube channel
RSS + HN), `youtube.ts` (Data API search). Scoring: `score.ts`. Per-source errors
are captured (`lastError`) and never abort the run.

### Reading & watching (in-app viewer)

Clicking a `FeedCard` opens `ItemViewerProvider`'s modal (`src/components/ItemViewer.tsx`)
instead of navigating away (cmd/ctrl-click still opens the source). Videos embed a
privacy-mode YouTube iframe (`src/lib/video.ts`). Blogs are fetched + extracted
**server-side** by `GET /api/read` (`@extractus/article-extractor`), sanitized with
a strict `sanitize-html` allowlist, and rendered via `.reader-content` styles in
`globals.css`. `/api/read` has an SSRF guard (public http(s) only) and is public so
the reader also works in preview mode. The reader/extraction packages are in
`serverExternalPackages` (next.config.ts).

### Ranking

Relevance is computed once at crawl time and stored (`score.ts`). The UI computes
the final **rank** live in `src/lib/rank.ts` (`relevance × recency × priority ×
viewsBoost`, 7-day recency half-life) so Top Picks stay fresh without re-crawling.
Selection helpers (`notHidden`, `inCategory`, `rankAll`) are in `src/lib/feed.ts`.

### Theming

Tailwind v4 is configured entirely in CSS — **no `tailwind.config.js`**. Tokens and
light/dark themes live in `src/app/globals.css` (`@theme inline { … }`). Category
accent colors are tokens in `src/types.ts` (`CATEGORY_COLORS`), applied inline.

### Adding to the data model

A new ordered/queried RTDB collection needs its `.indexOn` in
`database.rules.json`. Seed categories/sources live in `src/lib/defaults.ts`
(bump `SEED_VERSION` when changing them).
