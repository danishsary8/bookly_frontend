import { useCallback, useEffect, useRef, useState } from "react";
import { authApi, type TelegramLink, type TelegramStatus } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import type { Customer } from "@/api/types";

/*
 * The Bookly Telegram bot, from the website's side: ask the API for a one-time link, open it, and ask every
 * few seconds (and at once when the customer comes back to this tab) whether they shared their number.
 * `login` signs in ("Continue with Telegram"); `phone` confirms the signed-in customer's number.
 */
export type TelegramPurpose = "login" | "phone";

export type TelegramState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting"; link: TelegramLink }
  | { phase: "done"; customer: Customer }
  | { phase: "failed"; message: string };

export const POLL_MS = 2000;
export const EXPIRED = "This Telegram link has expired. Please try again.";

export function useTelegramLink(purpose: TelegramPurpose, onDone: (customer: Customer, result: TelegramStatus) => void) {
  const [state, setState] = useState<TelegramState>({ phase: "idle" });
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  /** Makes a new link; returns it so a click handler can open it at once. */
  const start = useCallback(async (): Promise<TelegramLink | null> => {
    setState({ phase: "starting" });
    try {
      const link = await (purpose === "login" ? authApi.telegram.signIn() : authApi.telegram.confirmPhone());
      setState({ phase: "waiting", link });
      return link;
    } catch (error) {
      setState({ phase: "failed", message: ApiError.from(error).message });
      return null;
    }
  }, [purpose]);

  const cancel = useCallback(() => setState({ phase: "idle" }), []);

  const key = state.phase === "waiting" ? state.link.key : null;
  const expiresAt = state.phase === "waiting" ? state.link.expires_at : null;
  useEffect(() => {
    if (!key || !expiresAt) return;
    let stopped = false;
    let timer: number | undefined;
    let asking = false;

    const check = async () => {
      if (stopped || asking) return;
      if (Date.parse(expiresAt) <= Date.now()) {
        setState({ phase: "failed", message: EXPIRED });
        return;
      }
      asking = true;
      try {
        const result = await authApi.telegram.status(key);
        if (stopped) return;
        if (result.status === "done") {
          stopped = true;
          setState({ phase: "done", customer: result.customer });
          done.current(result.customer, result);
          return;
        }
        if (result.status === "failed") {
          stopped = true;
          setState({ phase: "failed", message: result.message });
          return;
        }
      } catch (error) {
        const apiError = ApiError.from(error);
        if (apiError.kind === "not_found") {
          stopped = true;
          setState({ phase: "failed", message: EXPIRED });
          return;
        }
        // A dropped connection or a waking server: keep asking.
      } finally {
        asking = false;
      }
      if (!stopped) timer = window.setTimeout(() => void check(), POLL_MS);
    };

    // Back from the Telegram app: ask straight away instead of waiting for the next tick.
    const onReturn = () => {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(timer);
      void check();
    };
    timer = window.setTimeout(() => void check(), POLL_MS);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [key, expiresAt]);

  return { state, start, cancel };
}

/**
 * Opens the bot in a new tab or the Telegram app. Called right after the link arrives, still inside the
 * click's grace period; if the browser blocks it, the waiting panel's "Open Telegram" button does the same.
 */
export function openTelegram(url: string) {
  try {
    window.open(url, "_blank", "noopener");
  } catch {
    // Blocked: the panel's button is there.
  }
}
