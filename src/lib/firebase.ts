import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True once the Realtime Database URL is configured via env vars. */
export const isFirebaseConfigured = Boolean(firebaseConfig.databaseURL);

let app: FirebaseApp | null = null;
let database: Database | null = null;
let auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Returns the Realtime Database instance. Browser-only — the Firebase client
 * SDK must not run during SSR, so callers gate access behind `useMounted`.
 */
export function getDb(): Database {
  if (typeof window === "undefined") {
    throw new Error("getDb() must only be called in the browser");
  }
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.local"
    );
  }
  if (!database) {
    database = getDatabase(getFirebaseApp());
  }
  return database;
}

/** Returns the Auth instance. Browser-only, like {@link getDb}. */
export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("getFirebaseAuth() must only be called in the browser");
  }
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

// ---------------------------------------------------------------------------
// Per-user data namespacing
// ---------------------------------------------------------------------------
//
// Every user's data lives under `users/{uid}/…`. The signed-in uid is published
// here by the AuthProvider so the imperative write helpers in `db.ts`/`seed.ts`
// can build paths without threading the uid through every call.

let currentUid: string | null = null;

/** Called by the AuthProvider whenever the auth state changes. */
export function setCurrentUid(uid: string | null): void {
  currentUid = uid;
}

export function getCurrentUid(): string | null {
  return currentUid;
}

/**
 * Prefix a relative collection path with the signed-in user's namespace.
 * Throws if no user is signed in — all data access requires authentication.
 */
export function userPath(sub: string): string {
  if (!currentUid) {
    throw new Error("Not signed in: cannot access user data");
  }
  return `users/${currentUid}/${sub}`;
}
