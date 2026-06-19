# Growth Feed

A personal content platform that crawls **blogs, YouTube, and Hacker News** for
material matched to your interests, scores it for relevance, and presents it in a
clean UI organized by category — with **Top Picks** ranked for growth.

Built for a specific trajectory: senior Flutter → **AI/LLM systems engineering**.
The seed categories and sources reflect that (LLM engineering, GPU/inference
infra, ML foundations, Rust/systems, architecture, career growth, Flutter), but
everything is editable in the app.

- **Crawler** — pulls RSS/Atom feeds, YouTube channels (+ optional Data API
  search), and Hacker News searches; scores each item against your category
  keywords; de-dupes by URL; writes to Firebase Realtime Database.
- **Ranking** — Top Picks combine content relevance × freshness (7-day half-life)
  × category priority, so the things that matter most for growth surface first.
- **UI** — browse by category, see Top Picks and per-category rows, save items for
  later, hide noise, and **add / edit / remove categories and sources** live.
- **Read & watch in-app** — click any card to open a built-in **reader** (article
  fetched + extracted server-side, sanitized, themed) or an embedded **YouTube
  player**; cmd/ctrl-click still opens the original source.
- **Offline preview** — without any setup, the app shows real sample data from a
  demo crawl so you can see it immediately.

Stack: **Next.js 16 · React 19 · TypeScript · Tailwind v4 · Firebase Realtime
Database** (client) + **Firebase Admin SDK** (crawler).

---

## Quick look (no setup)

```bash
npm install
npm run crawl:demo   # crawls the default sources → public/sample-data.json
npm run dev          # http://localhost:3000  (Preview mode, read-only)
```

The demo crawl needs no credentials — it fetches real feeds and writes a local
JSON file the UI reads in preview mode.

---

## Full setup (your own live feed)

### 1. Firebase project

1. Create a project at the [Firebase Console](https://console.firebase.google.com).
2. **Build → Realtime Database → Create database.**
3. **Build → Authentication → Sign-in method → enable Google.**
4. In [`database.rules.json`](./database.rules.json) replace the placeholder
   `owner@example.com` with your own Google account email, then paste the file
   into **Realtime Database → Rules** and publish. (The rules hard-lock all data
   to that one email. Realtime Database rules can't read env vars, so the email
   must be literal here — use the same address you set for `NEXT_PUBLIC_OWNER_EMAIL`.)

### 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in:

- `NEXT_PUBLIC_FIREBASE_*` — the web config (Project settings → General → Your apps).
- `NEXT_PUBLIC_OWNER_EMAIL` — your Google account email; the only account allowed
  to sign in. Must match the email in your deployed `database.rules.json`.
- `FIREBASE_SERVICE_ACCOUNT_B64` — a service account key, base64-encoded, for the
  crawler. Project settings → Service accounts → **Generate new private key**, then:
  ```bash
  base64 -i serviceAccountKey.json | pbcopy   # macOS
  ```
- `YOUTUBE_API_KEY` *(optional)* — enables interest-matched YouTube **search**
  sources via the [YouTube Data API v3](https://console.cloud.google.com). Without
  it, only YouTube **channel** sources are crawled (they need no key).
- `CRON_SECRET` *(optional)* — protects the scheduled-crawl endpoint
  (`openssl rand -hex 24`).

### 3. Run

```bash
npm run dev      # http://localhost:3000 → sign in with Google
```

On first sign-in the app seeds the default categories + sources for your account.
Then populate the feed:

```bash
npm run crawl    # live crawl → writes items to your Realtime Database
```

…or click **Refresh** in the app header (triggers `POST /api/crawl`, authenticated
with your Firebase ID token).

---

## Crawling

| Command / route | What it does |
| --- | --- |
| `npm run crawl` | Live crawl → Firebase (reads your categories/sources). |
| `npm run crawl:force` | Same, force-refresh. |
| `npm run crawl:demo` | Offline crawl of the **default** sources → `public/sample-data.json`. |
| **Refresh** button | In-app trigger, owner-authenticated (`POST /api/crawl`). |
| `POST /api/cron/crawl` | Scheduled trigger, guarded by `CRON_SECRET`. |

### Scheduling

Hit the protected endpoint on a schedule:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-host>/api/cron/crawl
```

On **Vercel** this is already wired up: [`vercel.json`](./vercel.json) registers a
Cron Job hitting `/api/cron/crawl` daily (`0 1 * * *` = 06:30 IST). Just set
`CRON_SECRET` in the project's Environment Variables — Vercel automatically sends
it as the `Authorization: Bearer …` header the endpoint checks. (Hobby plans run
crons once daily; on Pro you can go more frequent, e.g. `0 */6 * * *`.) Locally, a
`cron` entry running `npm run crawl` works just as well.

Each crawl preserves your `read` / `saved` / `hidden` flags on items it re-sees,
and prunes unsaved items older than 45 days to keep the database lean.

---

## How it works

### Data model (Realtime Database, under `users/{uid}/`)

```
categories/{id}   { name, slug, keywords[], color, icon, priority(1–3), order, … }
sources/{id}      { type, name, categoryId, url|channelId|query, enabled,
                    lastFetchedAt, lastItemCount, lastError }
items/{hash}      { kind(blog|video), title, url, summary, thumbnail, source,
                    categoryId, categoryIds[], publishedAt, relevance(0–1),
                    views?, durationSeconds?, read?, saved?, hidden? }
meta/lastCrawl    { at, added, updated, sources, errors, durationMs }
```

Item ids are a SHA-1 hash of the normalized URL, so re-crawls update in place
instead of duplicating.

### Source types

- **`rss`** — any RSS/Atom feed (blogs, newsletters).
- **`youtube_channel`** — a channel's uploads via its public RSS (no API key);
  thumbnails are derived from the video id.
- **`youtube_search`** — Data API v3 search by query (needs `YOUTUBE_API_KEY`),
  enriched with view counts + durations.
- **`hn_search`** — high-signal Hacker News posts via `hnrss.org`.

### Relevance & ranking

- **Relevance** (computed at crawl time, stored on the item): keyword matches
  against the category's `keywords`, title hits weighted 2×, normalized to 0–1.
  See `src/lib/crawler/score.ts`.
- **Rank** (computed in the UI, so it stays fresh without re-crawling):
  `relevance × recency × priority × viewsBoost`, where recency decays with a
  7-day half-life and priority maps 1/2/3 → 1.0/1.5/2.0×. See `src/lib/rank.ts`.

### Customizing

Everything is editable in-app (**Categories** / **Sources** pages). To change the
*starter* set, edit `src/lib/defaults.ts` and bump `SEED_VERSION`, then use
**Settings → Reset to defaults** (keeps your saved items + read history).

---

## Project layout

```
src/
  app/                    # routes (App Router, client pages)
    page.tsx              # Top Picks + per-category rows
    c/[slug]/             # one category
    saved/ categories/ sources/ settings/
    api/crawl/            # in-app refresh (owner ID token)
    api/cron/crawl/       # scheduled crawl (CRON_SECRET)
    api/read/             # server-side article extraction for the reader
  components/ItemViewer   # in-app reader + YouTube player modal
  components/             # UI (FeedCard, CategoryChips, forms, …) + ui/ primitives
  hooks/                  # auth, realtime subscriptions, unified live/preview feed
  lib/
    crawler/             # the crawler (rss, youtube, score, admin, orchestrator)
    defaults.ts          # seed categories + sources
    db.ts seed.ts        # client RTDB mutations + first-run seeding
    rank.ts feed.ts      # ranking + selection
scripts/crawl.ts          # standalone crawl runner (live / demo)
database.rules.json       # owner-locked RTDB security rules
```

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build (typecheck + lint)
npm run start        # serve the production build
npm run lint         # eslint
npm run crawl        # live crawl → Firebase
npm run crawl:demo   # offline demo crawl → public/sample-data.json
```

There is no test runner configured — verify with `npm run build` and by
exercising the UI.
