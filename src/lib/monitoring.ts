/*
 * Error reporting for developers (Sentry). Customers never see these details; they get the
 * friendly messages in api/errors.ts and the error states.
 *
 * Off unless VITE_SENTRY_DSN is set. The Sentry SDK loads when the browser is idle, so it
 * isn't part of the first paint; anything reported before then (including uncaught errors)
 * is queued and sent once it's ready. No personal data: no emails, names or request bodies.
 */

type Extra = Record<string, unknown>;
type Tags = Record<string, string | number | null | undefined>;
type Report = { error: unknown; tags?: Tags; extra?: Extra };
type SentryModule = typeof import("./sentryClient");

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const MAX_QUEUED = 20;

let sentry: SentryModule | null = null;
const queue: Report[] = [];

const enabled = () => Boolean(DSN) && import.meta.env.MODE !== "test";

function send(S: SentryModule, { error, tags, extra }: Report) {
  S.withScope((scope) => {
    for (const [key, value] of Object.entries(tags ?? {})) if (value !== null && value !== undefined) scope.setTag(key, String(value));
    if (extra) scope.setExtras(extra);
    S.captureException(error);
  });
}

/** Sends an error to the developers (queued until the SDK has loaded). */
export function reportError(error: unknown, details: { tags?: Tags; extra?: Extra } = {}) {
  if (!enabled()) {
    if (import.meta.env.DEV) console.error("[report]", error, details);
    return;
  }
  if (sentry) send(sentry, { error, ...details });
  else if (queue.length < MAX_QUEUED) queue.push({ error, ...details });
}

const onEarlyError = (event: ErrorEvent) => reportError(event.error ?? event.message, { tags: { source: "window.onerror" } });
const onEarlyRejection = (event: PromiseRejectionEvent) => reportError(event.reason, { tags: { source: "unhandledrejection" } });

/** Call once at start-up. */
export function initMonitoring() {
  if (!enabled()) return;
  // Until Sentry's own handlers are installed, catch uncaught errors ourselves.
  window.addEventListener("error", onEarlyError);
  window.addEventListener("unhandledrejection", onEarlyRejection);

  const load = () =>
    import("./sentryClient").then((S) => {
      S.init({
        dsn: DSN,
        release: import.meta.env.VITE_RELEASE || undefined,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
        tracesSampleRate: 0,
        // Browser extensions and blocked third-party requests aren't Bookly's bugs.
        denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
      });
      window.removeEventListener("error", onEarlyError);
      window.removeEventListener("unhandledrejection", onEarlyRejection);
      sentry = S;
      for (const report of queue.splice(0)) send(S, report);
    });

  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
  idle(() => void load().catch(() => undefined));
}

/** For tests: drop queued reports and the loaded SDK. */
export function resetMonitoringForTests() {
  sentry = null;
  queue.length = 0;
}
