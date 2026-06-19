import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type Credential,
} from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

/**
 * Resolve Admin SDK credentials from (in order): a base64-encoded service
 * account, a raw JSON service account, or GOOGLE_APPLICATION_CREDENTIALS.
 */
function loadCredential(): Credential {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    return cert(JSON.parse(Buffer.from(b64, "base64").toString("utf8")));
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return cert(JSON.parse(raw));
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault();
  throw new Error(
    "No Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_B64 (see .env.local.example)."
  );
}

function databaseURL(): string {
  const url =
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    process.env.FIREBASE_DATABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set");
  return url;
}

let cached: App | undefined;

export function getAdminApp(): App {
  if (cached) return cached;
  const existing = getApps();
  cached = existing.length
    ? existing[0]
    : initializeApp({ credential: loadCredential(), databaseURL: databaseURL() });
  return cached;
}

export function getAdminDb(): Database {
  return getDatabase(getAdminApp());
}

/**
 * The owner's uid. Prefers OWNER_UID (no extra calls); otherwise discovers the
 * single account under /users via a cheap REST "shallow" read (keys only — never
 * downloads the data tree).
 */
export async function resolveOwnerUid(): Promise<string> {
  const fromEnv = process.env.OWNER_UID;
  if (fromEnv) return fromEnv;

  const app = getAdminApp();
  const token = await app.options.credential!.getAccessToken();
  const base = databaseURL().replace(/\/$/, "");
  const res = await fetch(
    `${base}/users.json?shallow=true&access_token=${token.access_token}`
  );
  if (!res.ok) {
    throw new Error(
      `Could not auto-detect owner uid (HTTP ${res.status}). Set OWNER_UID in .env.local.`
    );
  }
  const data = (await res.json()) as Record<string, true> | null;
  const uid = data ? Object.keys(data)[0] : undefined;
  if (!uid) {
    throw new Error(
      "No users found in the database. Sign in to the app once to seed your account, then re-run the crawler."
    );
  }
  return uid;
}
