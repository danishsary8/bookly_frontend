import type { BookVariant } from "@/api/types";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";

/*
 * Format choice on the book page: a radio group of cards (format, price, stock),
 * native radios underneath so arrow keys and screen readers work as expected.
 * Out-of-stock formats stay visible but can't be chosen.
 */

const DIGITAL = new Set(["ebook", "audiobook"]);

export function FormatPicker({ variants, value, onChange, name }: { variants: BookVariant[]; value: number | undefined; onChange: (id: number) => void; name: string }) {
  const currency = useCurrency();
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">Format</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
        {variants.map((v) => {
          const selected = v.id === value;
          const available = v.in_stock !== false;
          return (
            <label
              key={v.id}
              className={cn(
                "relative grid cursor-pointer gap-0.5 rounded-lg border p-3 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                selected ? "border-primary bg-lapis-tint" : "border-border bg-card hover:border-input",
                !available && "cursor-not-allowed opacity-60",
              )}
            >
              <input type="radio" name={name} value={v.id} checked={selected} disabled={!available} onChange={() => v.id && onChange(v.id)} className="sr-only" />
              <span className={cn("text-[15px] font-semibold", selected && "text-primary")}>{formatLabel(v.format)}</span>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(v.price_usd, v.price_khr, currency)}</span>
              <span className={cn("text-xs", available ? "text-muted-foreground" : "text-destructive")}>
                {!available ? "Out of stock" : DIGITAL.has(v.format ?? "") ? "Instant download" : "In stock"}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
