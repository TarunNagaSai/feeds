/**
 * Access is restricted to the site owner only, enforced in three layers:
 *  - client-side (here, used by AuthProvider) for immediate UX feedback,
 *  - server-side (the /api/crawl route verifies the ID token's email), and
 *  - Realtime Database security rules (database.rules.json) for actual security.
 *
 * The owner email comes from `NEXT_PUBLIC_OWNER_EMAIL` so it's never hardcoded in
 * source (the repo is public). It is empty when unset, which denies everyone — a
 * safe default. NOTE: it must match the literal email in your *deployed*
 * database.rules.json, since Realtime Database rules can't read env vars.
 */
export const ALLOWED_EMAIL = (
  process.env.NEXT_PUBLIC_OWNER_EMAIL ?? ""
).toLowerCase();

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!ALLOWED_EMAIL && !!email && email.toLowerCase() === ALLOWED_EMAIL;
}
