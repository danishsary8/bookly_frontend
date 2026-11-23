import { portalNext } from "./portal";

export { portalNext };

/** Where to go after signing in on /admin: an /admin page from ?next=, never back to an auth page. */
export const adminNext = (next: string | null | undefined) => portalNext("admin", next);
