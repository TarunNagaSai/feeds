"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";

/** Google "G" mark, sized to sit inside the sign-in button. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/** Full-screen gate shown when no owner is signed in. */
export function LoginScreen() {
  const { signInWithGoogle, error } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-fg">
        <Sparkles className="size-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Growth Feed</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Your personal feed of blogs and videos, matched to your interests and
        ranked for growth. Sign in to continue.
      </p>

      <Button
        size="lg"
        variant="secondary"
        className="mt-8 w-full max-w-xs"
        onClick={handleSignIn}
        disabled={busy}
      >
        {busy ? <Spinner /> : <GoogleIcon />}
        Continue with Google
      </Button>

      {error && <p className="mt-4 max-w-xs text-sm text-danger">{error}</p>}
    </div>
  );
}
