import { useQuery } from "@tanstack/react-query";
import { authApi, type VerifyChannel } from "@/api/endpoints/auth";
import type { Customer } from "@/api/types";

/*
 * Accounts are verified by their email or their phone (shared in the Telegram bot). Sessions saved before phones
 * existed only know `email_verified`, so both are read.
 */
export const isVerified = (user: Customer | null | undefined): boolean =>
  user ? (user.verified ?? user.email_verified ?? true) !== false : false;

export const needsVerifying = (user: Customer | null | undefined): boolean => Boolean(user) && !isVerified(user);

/** Remembers how the account is being confirmed, so /verify-email reopens on the right channel (e.g. from a guard). */
const KEY = "bookly:verify-via";

export function rememberChannel(channel: VerifyChannel) {
  try {
    sessionStorage.setItem(KEY, channel);
  } catch {
    // Private mode: the page falls back to the account's details.
  }
}

export function rememberedChannel(): VerifyChannel | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value === "email" || value === "telegram" ? value : null;
  } catch {
    return null;
  }
}

/** The verify page's URL for a channel, keeping `next`. */
export function verifyPath(channel: VerifyChannel, next: string | null, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ via: channel, ...extra });
  if (next) params.set("next", next);
  return `/verify-email?${params.toString()}`;
}

/** Whether the Bookly Telegram bot is on right now (cached; off if the API can't be asked). */
export function useTelegramBot(): boolean {
  const options = useQuery({ queryKey: ["auth", "options"], queryFn: authApi.options, staleTime: 10 * 60_000, retry: false });
  return options.data?.telegram === true;
}
