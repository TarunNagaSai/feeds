/**
 * Standalone crawler runner.
 *
 *   npm run crawl         # live crawl → writes to Firebase (needs .env.local)
 *   npm run crawl:force   # same, force-refresh
 *   npm run crawl:demo    # offline: crawl default sources → public/sample-data.json
 *
 * Run under tsx (see package.json scripts). Reads env from .env.local for live
 * runs; demo mode needs no configuration at all.
 */
import { runCrawl } from "../src/lib/crawler/index";

async function main() {
  const args = process.argv.slice(2);
  const demo = args.includes("--demo") || args.includes("--dry-run");
  const force = args.includes("--force");

  const result = await runCrawl({ demo, force, log: (m) => console.log(m) });

  const secs = (result.durationMs / 1000).toFixed(1);
  console.log("");
  if (result.demo) {
    console.log(
      `✅ Demo crawl complete: ${result.added} items in ${secs}s (${result.errors} source errors). Open the app to preview them.`
    );
  } else {
    console.log(
      `✅ Crawl complete: +${result.added} new, ~${result.updated} updated in ${secs}s (${result.errors} source errors).`
    );
  }
}

main().catch((e) => {
  console.error("\n❌ Crawl failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
