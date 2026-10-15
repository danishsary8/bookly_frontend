import { Loader2, Send } from "lucide-react";
import { CtaGlare } from "@/components/CtaGlare";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { Rich } from "@/i18n/Rich";

/*
 * "Waiting for Telegram": what the customer does in the Bookly bot, in order, while the page asks the API
 * every few seconds. The three steps are a real sequence, so they're an ordered list (like the order
 * timeline). `primary`: "Open Telegram" is the view's one vermilion CTA (verify page); elsewhere it's an
 * outline button next to the page's own CTA.
 */

export function TelegramWait({
  url,
  signIn = false,
  primary = false,
  onCancel,
  className,
}: {
  url: string;
  /** "Continue with Telegram": the bot's button is "Yes, sign me in" (it asks first, so a sent link can be refused). */
  signIn?: boolean;
  primary?: boolean;
  onCancel?: () => void;
  className?: string;
}) {
  const { dict } = useT();
  const t = dict.telegram;
  const steps = [t.open, t.tapStart, signIn ? t.tapYes : t.tapShare];
  const open = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: primary ? "cta" : "outline", size: primary ? "lg" : "default" }), "w-full")}
    >
      <Send aria-hidden="true" /> {t.open}
    </a>
  );
  return (
    <div className={cn("grid gap-4 rounded-lg border border-border bg-card p-4 sm:p-5", className)}>
      <p role="status" aria-live="polite" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
        <Loader2 className="size-[18px] animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        {t.waiting}
      </p>
      <ol className="grid gap-2.5 text-[15px] text-muted-foreground">
        {steps.map((step, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-primary text-xs font-semibold tabular-nums text-primary" aria-hidden="true">
              {index + 1}
            </span>
            <span>
              <Rich text={step} strong="font-semibold text-foreground" />
            </span>
          </li>
        ))}
      </ol>
      {primary ? <CtaGlare block>{open}</CtaGlare> : open}
      <p className="text-sm text-muted-foreground">
        {t.carriesOn}
      </p>
      {onCancel ? (
        <Button type="button" variant="link" className="min-h-11 w-max px-0 text-sm" onClick={onCancel}>
          {dict.ui.cancel}
        </Button>
      ) : null}
    </div>
  );
}
