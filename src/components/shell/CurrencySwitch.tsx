import { motion } from "motion/react";
import { RadioGroup } from "radix-ui";
import { useId } from "react";
import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { setCurrency, useCurrency, type Currency } from "@/stores/currency";

/*
 * MASTER §6.21: USD / KHR segmented control. A radiogroup (arrow keys switch),
 * 36px segments inside a 44px hit area, the active pill slides between them.
 * Every price reads the same store, so the page switches at once.
 */

const options: { value: Currency; label: string; symbol: string; lang?: string }[] = [
  { value: "USD", label: "USD", symbol: "$" },
  { value: "KHR", label: "KHR", symbol: "៛", lang: "km" },
];

export function CurrencySwitch({ className }: { className?: string }) {
  const currency = useCurrency();
  const layoutId = `currency-${useId()}`;

  return (
    <RadioGroup.Root
      value={currency}
      onValueChange={(value) => setCurrency(value as Currency)}
      aria-label="Currency"
      orientation="horizontal"
      className={cn("inline-flex h-11 items-center rounded-lg border border-border bg-card p-1", className)}
    >
      {options.map((option) => {
        const active = currency === option.value;
        return (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            className={cn(
              "relative grid h-9 min-w-14 place-items-center whitespace-nowrap rounded-md px-2.5 text-sm font-semibold tabular-nums transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span layoutId={layoutId} transition={transitions.toggle} className="absolute inset-0 rounded-md bg-primary" aria-hidden="true" />
            ) : null}
            <span className="relative">
              {option.label} <span lang={option.lang} aria-hidden="true">{option.symbol}</span>
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
