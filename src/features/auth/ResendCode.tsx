import { useState } from "react";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/hooks/useCooldown";
import { useTurnstile } from "./turnstile";
import { toast } from "@/stores/toast";

/*
 * "Didn't get it? Resend code" with a cooldown. The API allows 3 codes per
 * 10 minutes per visitor; a 429 starts the cooldown from its Retry-After instead. Customer pages pass
 * `turnstileAction` so the request carries a Cloudflare Turnstile token (staff pages don't).
 */
const COOLDOWN_S = 60;

export function ResendCode({
  send,
  startCoolingDown = false,
  turnstileAction,
  sentMessage = "Check your inbox (and spam folder). It may take a minute.",
}: {
  send: (turnstileToken?: string) => Promise<unknown>;
  startCoolingDown?: boolean;
  turnstileAction?: string;
  sentMessage?: string;
}) {
  const cooldown = useCooldown(startCoolingDown ? COOLDOWN_S : 0);
  const [sending, setSending] = useState(false);
  const turnstile = useTurnstile(
    turnstileAction ?? "resend_code",
    Boolean(turnstileAction),
  );

  const resend = async () => {
    setSending(true);
    try {
      await send(await turnstile.getToken());
      toast.success({
        title: "New code sent",
        description: sentMessage,
      });
      cooldown.start(COOLDOWN_S);
    } catch (error) {
      const apiError = ApiError.from(error);
      if (apiError.kind === "rate_limited")
        cooldown.start(apiError.retryAfter ?? COOLDOWN_S);
      toast.error({
        title: "Couldn't send a new code",
        description: apiError.message,
      });
    } finally {
      setSending(false);
      turnstile.reset();
    }
  };

  return (
    <>
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        Didn't get it?
        <Button
          type="button"
          variant="link"
          className="min-h-11 px-0"
          onClick={resend}
          disabled={sending || cooldown.remaining > 0}
          aria-live="polite"
        >
          {sending
            ? "Sending…"
            : cooldown.remaining > 0
              ? `Resend code in ${cooldown.remaining}s`
              : "Resend code"}
        </Button>
      </p>
      {turnstile.widget}
    </>
  );
}
