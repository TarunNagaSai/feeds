import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client. Used to gate
 * browser-only Firebase access so subscriptions never run during SSR/hydration.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Mount gate: flip once after the first client render so browser-only
    // Firebase access never runs during SSR/hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}
