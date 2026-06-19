/**
 * Access is restricted to the site owner only. This is enforced in two places:
 *  - client-side (here, used by AuthProvider) for immediate UX feedback, and
 *  - Realtime Database security rules (database.rules.json) for actual security.
 * Keep the email in sync between this file and database.rules.json.
 */
export const ALLOWED_EMAIL = "tarunnagasai007@gmail.com";

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();
}
