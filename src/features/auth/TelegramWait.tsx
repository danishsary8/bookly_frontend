import { Loader2, Send } from "lucide-react";
import { CtaGlare } from "@/components/CtaGlare";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * "Waiting for Telegram": what the customer does in the Bookly bot, in order, while the page asks the API
 * every few seconds. The three steps are a real sequence, so they're an ordered list (like the order
 * timeline). `primary`: "Open Telegram" is the view's one vermilion CTA (verify page); elsewhere it's an
 * outline button next to the page's own CTA.
 */
const STEPS = [
  <>Open Telegram</>,
  <>
    Tap <strong className="font-semibold text-foreground">Start</strong> in the Bookly bot
  </>,
  <>
    Tap <strong className="font-semibold text-foreground">Share my phone number</strong>
  </>,
];

export function TelegramWait({
  url,
  primary = false,
  onCancel,
  className,
}: {
  url: string;
  primary?: boolean;
  onCancel?: () => void;
  className?: string;
}) {
  const open = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: primary ? "cta" : "outline", size: primary ? "lg" : "default" }), "w-full")}
    >
      <Send aria-hidden="true" /> Open Telegram
    </a>
  );
  return (
    <div className={cn("grid gap-4 rounded-lg border border-border bg-card p-4 sm:p-5", className)}>
      <p role="status" aria-live="polite" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
        <Loader2 className="size-[18px] animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        Waiting for Telegram…
      </p>
      <ol className="grid gap-2.5 text-[15px] text-muted-foreground">
        {STEPS.map((step, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-primary text-xs font-semibold tabular-nums text-primary" aria-hidden="true">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {primary ? <CtaGlare block>{open}</CtaGlare> : open}
      <p className="text-sm text-muted-foreground">
        This page carries on by itself once you've shared your number. The link works for 10 minutes.
      </p>
      {onCancel ? (
        <Button type="button" variant="link" className="min-h-11 w-max px-0 text-sm" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
