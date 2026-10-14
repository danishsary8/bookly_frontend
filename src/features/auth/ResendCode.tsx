import { useState } from "react";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/hooks/useCooldown";
import { useTurnstile } from "./turnstile";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

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
  sentMessage,
}: {
  send: (turnstileToken?: string) => Promise<unknown>;
  startCoolingDown?: boolean;
  turnstileAction?: string;
  sentMessage?: string;
}) {
  const cooldown = useCooldown(startCoolingDown ? COOLDOWN_S : 0);
  const [sending, setSending] = useState(false);
  const { dict } = useT();
  const s = dict.signin;
  const turnstile = useTurnstile(
    turnstileAction ?? "resend_code",
    Boolean(turnstileAction),
  );

  const resend = async () => {
    setSending(true);
    try {
      await send(await turnstile.getToken());
      toast.success({
        title: s.newCodeSent,
        description: sentMessage ?? s.checkInbox,
      });
      cooldown.start(COOLDOWN_S);
    } catch (error) {
      const apiError = ApiError.from(error);
      if (apiError.kind === "rate_limited")
        cooldown.start(apiError.retryAfter ?? COOLDOWN_S);
      toast.error({
        title: s.newCodeFailed,
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
        {s.didntGet}
        <Button
          type="button"
          variant="link"
          className="min-h-11 px-0"
          onClick={resend}
          disabled={sending || cooldown.remaining > 0}
          aria-live="polite"
        >
          {sending ? dict.ui.sending : cooldown.remaining > 0 ? s.resendIn(cooldown.remaining) : s.resend}
        </Button>
      </p>
      {turnstile.widget}
    </>
  );
}
