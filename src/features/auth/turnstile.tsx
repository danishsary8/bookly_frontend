import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";

/*
 * Cloudflare Turnstile, the bot check on sign-up, sign-in and the forms that email a code.
 *
 * - Off unless VITE_TURNSTILE_SITE_KEY is set (local, tests, until the owner adds the key); then the
 *   forms send no token and the API, which has no secret either, doesn't ask for one.
 * - Cloudflare's script loads only on these pages, and the widget runs in "interaction-only" mode:
 *   most people never see it; a box appears only when Cloudflare wants someone to tick it.
 * - Tokens are single-use: `getToken()` waits for one (the check takes about a second), and
 *   `reset()` after each request fetches a fresh one for the next try.
 */

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const WAIT_MS = 15_000;

export const turnstileSiteKey = () => (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || "";

let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not start")));
    script.onerror = () => {
      loading = null; // let a later page try again
      script.remove();
      reject(new Error("Turnstile could not load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function useTurnstile(action: string, active = true) {
  const siteKey = turnstileSiteKey();
  const enabled = active && siteKey !== "";
  const el = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<Array<(value: string | undefined) => void>>([]);
  const [problem, setProblem] = useState(false);
  const [interactive, setInteractive] = useState(false);

  const settle = (value: string | undefined) => {
    for (const resolve of waiting.current.splice(0)) resolve(value);
  };

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !el.current) return;
        widgetId.current = ts.render(el.current, {
          sitekey: siteKey,
          action,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          size: "flexible",
          appearance: "interaction-only",
          callback: (value: string) => {
            token.current = value;
            setProblem(false);
            settle(value);
          },
          "expired-callback": () => {
            token.current = null;
            if (widgetId.current) ts.reset(widgetId.current);
          },
          "error-callback": () => {
            setProblem(true);
            settle(undefined);
            return true; // handled: no console noise from Cloudflare's script
          },
          "before-interactive-callback": () => setInteractive(true),
          "after-interactive-callback": () => setInteractive(false),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setProblem(true);
        settle(undefined);
      });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      token.current = null;
    };
  }, [enabled, siteKey, action]);

  /** The token for the next request, or undefined when the check is off or couldn't finish (the API then says why). */
  const getToken = useCallback((): Promise<string | undefined> => {
    if (!enabled) return Promise.resolve(undefined);
    if (token.current) return Promise.resolve(token.current);
    return new Promise((resolve) => {
      waiting.current.push(resolve);
      window.setTimeout(() => resolve(token.current ?? undefined), WAIT_MS);
    });
  }, [enabled]);

  /** Call after every request that used the token: it can't be used twice. */
  const reset = useCallback(() => {
    token.current = null;
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  const widget = enabled ? (
    <div className={interactive || problem ? "grid gap-2" : "contents"}>
      {/* The box only takes space while Cloudflare is asking for a tick. */}
      <div ref={el} className={interactive ? "min-h-[65px]" : undefined} />
      {problem ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground" role="status">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          The security check didn't load. Check your connection, or allow challenges.cloudflare.com if you use a blocker, then reload the page.
        </p>
      ) : null}
    </div>
  ) : null;

  return { widget, getToken, reset, enabled };
}

/** For tests: forget the loaded script. */
export function resetTurnstileForTests() {
  loading = null;
}
