import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/errors";

export type EmailLinkState = "loading" | "success" | "invalid" | "error";

/*
 * The one call an email link makes (confirm the newsletter, unsubscribe, stop cart reminders), run once on arrival.
 * A missing token or the API's 422/404 means the link is expired or wrong ("invalid": the page says how to fix it);
 * anything else (offline, server error) is "error" and can be retried. The API answers a repeated click with the same
 * success, so "already done" reads as success.
 */
export function useEmailLink(run: () => Promise<unknown>, valid: boolean) {
  const [state, setState] = useState<EmailLinkState>(valid ? "loading" : "invalid");
  // The API's own success sentence (the newsletter answers with one); pages fall back to their own text.
  const [message, setMessage] = useState("");
  const started = useRef(false);
  // State changes only after the API answers (never synchronously inside the effect).
  const call = useCallback(() => {
    run().then(
      (result: unknown) => {
        const text = typeof result === "object" && result !== null && "message" in result ? result.message : null;
        if (typeof text === "string") setMessage(text);
        setState("success");
      },
      (error: unknown) => {
        const kind = ApiError.from(error).kind;
        setState(kind === "validation" || kind === "not_found" ? "invalid" : "error");
      },
    );
  }, [run]);

  useEffect(() => {
    if (!valid || started.current) return;
    started.current = true;
    call();
  }, [valid, call]);

  const retry = () => {
    setState("loading");
    call();
  };
  return { state, message, retry };
}
