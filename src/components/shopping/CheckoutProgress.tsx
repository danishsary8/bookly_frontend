import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * The buying journey as one quiet rail (pages/shopping.md): Cart → Delivery & payment → (Pay, KHQR only) → Done.
 * Finished steps show a check (the cart step links back while checking out); the current one has
 * aria-current="step". The rule between two steps fills in lapis once the first is done. Below 640px only the
 * discs and the current label show (the other labels stay for screen readers).
 */

export type CheckoutStep = "cart" | "details" | "pay" | "done";

const labelKey = { cart: "stepCart", details: "stepDetails", pay: "stepPay", done: "stepDone" } as const;

export function CheckoutProgress({ current, withPay = false, className }: { current: CheckoutStep; withPay?: boolean; className?: string }) {
  const { dict } = useT();
  const s = dict.shopping;
  const steps: CheckoutStep[] = withPay ? ["cart", "details", "pay", "done"] : ["cart", "details", "done"];
  const at = steps.indexOf(current);

  return (
    <nav aria-label={s.progressLabel} className={cn("min-w-0", className)}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, i) => {
          const state = i < at ? "done" : i === at ? "current" : "todo";
          const label = s[labelKey[step]];
          const disc = (
            <span
              className={cn(
                "checkout-step-marker grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold tabular-nums transition-colors duration-300",
                state === "done" && "bg-primary text-primary-foreground",
                state === "current" && "bg-card text-primary shadow-[inset_0_0_0_2px_var(--primary),0_0_0_4px_color-mix(in_srgb,var(--primary)_14%,transparent)]",
                state === "todo" && "bg-card text-muted-foreground shadow-[inset_0_0_0_1px_var(--input)]",
              )}
              aria-hidden="true"
            >
              {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : <span className="checkout-step-number">{i + 1}</span>}
            </span>
          );
          const text = (
            <span className={cn("text-sm font-semibold", state === "current" ? "text-foreground" : "sr-only text-muted-foreground sm:not-sr-only")}>
              {label}
              {state === "done" ? <span className="sr-only"> ({s.stepDoneSr})</span> : null}
            </span>
          );
          return (
            <li key={step} data-step-state={state} className="flex items-center gap-2 sm:gap-3" aria-current={state === "current" ? "step" : undefined}>
              {step === "cart" && state === "done" && current === "details" ? (
                <Link to="/cart" className="group flex min-h-11 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {disc}
                  <span className="sr-only text-sm font-semibold text-muted-foreground underline-offset-4 group-hover:text-foreground group-hover:underline sm:not-sr-only">
                    {label}
                    <span className="sr-only"> ({s.stepDoneSr})</span>
                  </span>
                </Link>
              ) : (
                <span className="flex min-h-11 items-center gap-2">
                  {disc}
                  {text}
                </span>
              )}
              {i < steps.length - 1 ? (
                <span className="relative h-px w-6 overflow-hidden rounded-full bg-border sm:w-10" aria-hidden="true">
                  <span className={cn("absolute inset-0 origin-left bg-primary transition-transform duration-700 ease-out motion-reduce:transition-none", i < at ? "scale-x-100" : "scale-x-0")} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
