import { TrendingDown, TrendingUp } from "lucide-react";
import { TextField } from "@/components/form/Field";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { charmPrice, profitOf } from "./pricing";

const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

/*
 * Sell price and supplier cost side by side, with the profit per copy worked out as you type.
 * The cost is admin-only (the API hides it from staff), so staff see the price alone.
 */
export function PricingFields({
  price,
  cost,
  onPrice,
  onCost,
  priceError,
  costError,
  showCost,
}: {
  price: string;
  cost: string;
  onPrice: (v: string) => void;
  onCost: (v: string) => void;
  priceError?: string;
  costError?: string;
  showCost: boolean;
}) {
  const { dict } = useT();
  const t = dict.bookForm;
  const charm = charmPrice(price);
  const result = profitOf(price, cost);

  return (
    <div className="grid gap-3">
      <div className={cn("grid grid-cols-1 gap-4", showCost && "sm:grid-cols-2")}>
        <div className="grid content-start gap-1">
          <TextField
            label={t.sellPrice}
            inputMode="decimal"
            placeholder="12.99"
            value={price}
            onChange={(e) => onPrice(e.target.value)}
            error={priceError}
            hint={dict.shopExtras.charmHint}
          />
          {charm ? (
            <button
              type="button"
              onClick={() => onPrice(charm)}
              className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {dict.shopExtras.makeCharm(charm)}
            </button>
          ) : null}
        </div>
        {showCost ? (
          <TextField
            label={t.cost}
            optional
            inputMode="decimal"
            placeholder="8.50"
            value={cost}
            onChange={(e) => onCost(e.target.value)}
            error={costError}
            hint={t.costHint}
          />
        ) : null}
      </div>
      {showCost ? (
        <p
          aria-live="polite"
          data-testid="profit-line"
          className={cn(
            "flex min-h-11 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-3.5 py-2 text-[15px]",
            result.kind === "profit" && "bg-success-tint text-foreground",
            result.kind === "loss" && "bg-destructive-tint text-foreground",
            result.kind === "none" && "bg-surface-2 text-muted-foreground",
          )}
        >
          {result.kind === "none" ? (
            t.noCost
          ) : (
            <>
              {result.kind === "profit" ? (
                <TrendingUp className="size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-4 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <span className="font-semibold tabular-nums">
                {result.kind === "profit"
                  ? t.profit.replace("{v}", formatUsd(result.amount))
                  : t.loss.replace("{v}", formatUsd(-result.amount))}
              </span>
              <span className="text-muted-foreground tabular-nums">
                · {result.kind === "profit" ? t.margin.replace("{p}", percent.format(result.margin)) : t.lossHint}
              </span>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
