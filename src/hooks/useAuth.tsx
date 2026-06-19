"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isAllowedEmail } from "@/lib/access";
import { clearCache } from "@/lib/cache";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  setCurrentUid,
} from "@/lib/firebase";

interface AuthState {
  /** The signed-in owner, or `null` when signed out / still loading. */
  user: User | null;
  /** True until the initial auth state has resolved. */
  loading: boolean;
  /** Last sign-in error message, if any. */
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Tracks the Firebase auth session and exposes it to the tree. Mirrors the
 * current uid into the firebase module so the imperative DB helpers can scope
 * writes to the signed-in user. Non-owner sessions are rejected immediately
 * (the RTDB rules are the real boundary; this is just fast UX feedback).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      if (u && !isAllowedEmail(u.email)) {
        // Someone signed in who isn't the owner — sign them straight back out.
        clearCache();
        void firebaseSignOut(getFirebaseAuth());
        setCurrentUid(null);
        setUser(null);
        setError("This app is private to its owner.");
        setLoading(false);
        return;
      }
      setCurrentUid(u?.uid ?? null);
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      async signInWithGoogle() {
        setError(null);
        try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(getFirebaseAuth(), provider);
        } catch (e) {
          const code = (e as { code?: string })?.code;
          if (
            code === "auth/popup-closed-by-user" ||
            code === "auth/cancelled-popup-request"
          ) {
            return;
          }
          setError(e instanceof Error ? e.message : "Sign-in failed.");
        }
      },
      async signOut() {
        clearCache();
        await firebaseSignOut(getFirebaseAuth());
      },
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
