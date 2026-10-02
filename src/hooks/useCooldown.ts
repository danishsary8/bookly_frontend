import { useEffect, useState } from "react";

/** A seconds countdown for "Resend code" buttons: start(n) begins it, `remaining` ticks to 0. */
export function useCooldown(initial = 0) {
  const [remaining, setRemaining] = useState(initial);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);
  return { remaining, start: (seconds: number) => setRemaining(Math.max(0, Math.ceil(seconds))) };
}
