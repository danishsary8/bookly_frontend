import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/api/errors";

/**
 * Puts an API error onto a React Hook Form form: each 422 field message goes to its
 * field (when the form has it), and whatever is left is returned as the form-level
 * message for a <FormAlert>. Returns null when every message landed on a field.
 */
export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly Path<T>[]): string | null {
  const apiError = ApiError.from(error);
  if (apiError.kind !== "validation" || !apiError.fieldErrors) return apiError.message;

  let unplaced = false;
  let first = true;
  for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
    if ((fields as readonly string[]).includes(field) && messages[0]) {
      setError(field as Path<T>, { type: "server", message: messages[0] }, { shouldFocus: first });
      first = false;
    } else {
      unplaced = true;
    }
  }
  const placedAny = !first;
  return unplaced || !placedAny ? apiError.message : null;
}

/**
 * The `?next=` return path, only if it is a path on this site ("/books/7"). Anything
 * else (another origin, "//evil.com", "javascript:", the auth pages themselves)
 * falls back, so a crafted link can't send someone off-site after signing in.
 */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const url = new URL(next, "https://bookly.invalid");
    if (url.origin !== "https://bookly.invalid") return fallback;
    if (/^\/(login|register|verify-email|forgot-password|reset-password)(\/|$)/.test(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

/** "/login?next=…" (or another auth page) carrying the given return path. */
export const withNext = (path: string, next: string | null | undefined) => {
  const safe = safeNext(next, "");
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
};
