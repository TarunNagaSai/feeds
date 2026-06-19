"use client";

import { useEffect, useRef } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { seedDefaults } from "@/lib/seed";
import { Header } from "./Header";
import { LoginScreen } from "./LoginScreen";
import { LoadingScreen } from "./ui/Spinner";

/**
 * Top-level chrome + auth gate. Until the owner signs in, only the login screen
 * renders. When Firebase isn't configured we fall through to the normal shell so
 * pages can show the sample-data preview (and management pages a ConfigNotice).
 *
 * Also seeds the starter categories/sources once, on the owner's first visit.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const seeded = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !user || seeded.current) return;
    seeded.current = true;
    seedDefaults().catch(() => {
      seeded.current = false; // allow a retry on next render after a failure
    });
  }, [user]);

  if (isFirebaseConfigured && loading) {
    return (
      <div className="flex flex-1 flex-col">
        <LoadingScreen />
      </div>
    );
  }
  if (isFirebaseConfigured && !user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6">
        {children}
      </main>
    </div>
  );
}
