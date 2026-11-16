export function triggerSentryTestError() {
  throw new Error("Sentry source map test " + new Date().toISOString());
}
