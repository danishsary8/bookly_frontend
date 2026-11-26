import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * The buying journey as one quiet rail:
 * Cart → Delivery → Payment → Confirm → Order confirmed (with optional Pay step on KHQR payment page).
 * Finished steps show a check (clickable back to cart or earlier checkout steps); the current one has
 * aria-current="step". Below 640px only the discs and the current label show (other labels stay for screen readers).
 */

export type CheckoutStep = "cart" | "delivery" | "payment" | "review" | "pay" | "done" | "details";

const labelKey = {
  cart: "stepCart",
  details: "stepDetails",
  delivery: "stepDelivery",
  payment: "stepPayment",
  review: "stepReview",
  pay: "stepPay",
  done: "stepDone",
} as const;

export function CheckoutProgress({
  current,
  withPay = false,
  onStepClick,
  className,
}: {
  current: CheckoutStep;
  withPay?: boolean;
  onStepClick?: (step: CheckoutStep) => void;
  className?: string;
}) {
  const { dict } = useT();
  const s = dict.shopping;
  const normalizedCurrent: CheckoutStep = current === "details" ? "delivery" : current;
  const steps: CheckoutStep[] =
    normalizedCurrent === "pay" || withPay
      ? ["cart", "delivery", "payment", "review", "done"]
      : ["cart", "delivery", "payment", "review", "done"];
  const at = normalizedCurrent === "pay" ? 3 : steps.indexOf(normalizedCurrent);
  const inCheckout = normalizedCurrent === "delivery" || normalizedCurrent === "payment" || normalizedCurrent === "review";

  return (
    <nav aria-label={s.progressLabel} className={cn("no-scrollbar max-w-full min-w-0 overflow-x-auto", className)}>
      <ol className="flex w-max items-center gap-1 px-2 py-2.5 sm:w-auto sm:gap-2.5">
        {steps.map((step, i) => {
          const state = i < at ? "done" : i === at ? "current" : "todo";
          const isFinalComplete = step === "done" && state === "current";
          const label = s[labelKey[step]];
          const disc = (
            <span
              className={cn(
                "checkout-step-marker relative isolate grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums transition-all duration-300 sm:size-7 sm:text-[13px]",
                state === "done" && "bg-primary text-primary-foreground shadow-[0_3px_10px_-3px_color-mix(in_srgb,var(--primary)_55%,transparent)]",
                state === "current" && !isFinalComplete && "bg-card text-primary shadow-[inset_0_0_0_2px_var(--primary),0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
                isFinalComplete && "bg-success text-success-foreground shadow-[0_0_0_4px_color-mix(in_srgb,var(--success)_20%,transparent)]",
                state === "todo" && "bg-card text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--input)]",
              )}
              aria-hidden="true"
            >
              {state === "current" ? (
                <>
                  <span className="checkout-step-ring" />
                  <span className="checkout-step-ring checkout-step-ring-2" />
                </>
              ) : null}
              {state === "done" || isFinalComplete ? (
                <Check className="checkout-step-check relative z-[1] size-3.5" strokeWidth={3} />
              ) : (
                <span className="checkout-step-number relative z-[1]">{i + 1}</span>
              )}
            </span>
          );
          const text = (
            <span
              className={cn(
                "checkout-step-label whitespace-nowrap text-xs font-semibold sm:text-sm",
                isFinalComplete ? "text-success" : state === "current" ? "text-foreground" : "sr-only text-muted-foreground sm:not-sr-only",
              )}
            >
              {label}
              {state === "done" ? <span className="sr-only"> ({s.stepDoneSr})</span> : null}
            </span>
          );

          const canClickBack = state === "done" && inCheckout && onStepClick && (step === "delivery" || step === "payment");

          return (
            <li
              key={step}
              data-step-state={state}
              data-step-complete={isFinalComplete ? "true" : undefined}
              className="flex items-center gap-1.5 sm:gap-2.5"
              aria-current={state === "current" ? "step" : undefined}
            >
              {step === "cart" && state === "done" && inCheckout ? (
                <Link to="/cart" className="group flex min-h-11 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {disc}
                  <span className="checkout-step-label sr-only text-sm font-semibold text-muted-foreground underline-offset-4 group-hover:text-foreground group-hover:underline sm:not-sr-only">
                    {label}
                    <span className="sr-only"> ({s.stepDoneSr})</span>
                  </span>
                </Link>
              ) : canClickBack ? (
                <button
                  type="button"
                  onClick={() => onStepClick(step)}
                  className="group flex min-h-11 cursor-pointer items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {disc}
                  <span className="checkout-step-label sr-only text-sm font-semibold text-muted-foreground underline-offset-4 group-hover:text-foreground group-hover:underline sm:not-sr-only">
                    {label}
                    <span className="sr-only"> ({s.stepDoneSr})</span>
                  </span>
                </button>
              ) : (
                <span className="flex min-h-11 items-center gap-2">
                  {disc}
                  {text}
                </span>
              )}
              {i < steps.length - 1 ? (
                <span className="checkout-step-connector relative h-[2px] w-3 shrink-0 overflow-hidden rounded-full bg-border sm:w-7" aria-hidden="true">
                  <span className={cn("absolute inset-0 origin-left bg-primary transition-transform duration-500 ease-out motion-reduce:transition-none", i < at ? "scale-x-100" : "scale-x-0")} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
