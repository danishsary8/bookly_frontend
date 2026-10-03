import { safeNext } from "@/lib/forms";

const AUTH_PAGES = /^\/admin\/(login|two-factor|reset-password)(\/|$)/;

/** Where to go after signing in: an /admin page from ?next=, never back to an auth page. */
export const adminNext = (next: string | null | undefined) => {
  const safe = safeNext(next, "");
  return safe.startsWith("/admin") && !AUTH_PAGES.test(safe) ? safe : "/admin";
};
