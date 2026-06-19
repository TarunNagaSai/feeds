import { fetchJson, truncate } from "./util";
import type { RawItem } from "./rss";

interface GHRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics?: string[];
  created_at: string;
  pushed_at: string;
  owner?: { login?: string; avatar_url?: string };
}
interface GHSearchResponse {
  items?: GHRepo[];
}

/** ISO date `days` ago (YYYY-MM-DD), for GitHub search date qualifiers. */
function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * "Trending" GitHub repositories via the official Search API — a reliable proxy
 * for GitHub's (API-less) trending page: new repos (created in the last 90 days),
 * actively pushed, with the most stars, optionally narrowed by `query` (free
 * text and/or qualifiers like `language:rust` or `topic:llm`).
 *
 * Unauthenticated search is rate-limited (10 req/min); set `GITHUB_TOKEN` to
 * raise it. Stars are surfaced via `views` so they nudge ranking + render as a
 * star count on the card; `pushed_at` drives recency so active repos stay fresh.
 */
export async function fetchGitHubTrending(
  query: string,
  max = 12
): Promise<RawItem[]> {
  const filters = [
    query.trim(),
    `created:>${isoDaysAgo(90)}`,
    "stars:>5",
  ]
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams({
    q: filters,
    sort: "stars",
    order: "desc",
    per_page: String(Math.min(Math.max(max, 1), 50)),
  });

  const token = process.env.GITHUB_TOKEN;
  const data = await fetchJson<GHSearchResponse>(
    `https://api.github.com/search/repositories?${params.toString()}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const out: RawItem[] = [];
  for (const repo of data.items ?? []) {
    if (!repo.full_name || !repo.html_url) continue;
    const meta = [
      repo.language ? repo.language : null,
      repo.topics?.length ? repo.topics.slice(0, 3).join(", ") : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const summaryParts = [repo.description?.trim(), meta].filter(Boolean);
    out.push({
      kind: "blog",
      title: repo.full_name,
      url: repo.html_url,
      summary: summaryParts.length
        ? truncate(summaryParts.join(" — "), 260)
        : undefined,
      thumbnail: repo.owner?.avatar_url,
      author: repo.owner?.login,
      channelTitle: repo.language ?? undefined,
      // Recent activity → fresh in the recency-weighted ranking.
      publishedAt: Date.parse(repo.pushed_at || repo.created_at) || Date.now(),
      // Stars double as the popularity signal (viewsBoost) + card badge.
      views: repo.stargazers_count,
    });
  }
  return out;
}
