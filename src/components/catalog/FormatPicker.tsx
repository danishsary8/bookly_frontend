import type { BookVariant } from "@/api/types";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { formatName, useT } from "@/i18n";
import { BookOpen, Check, Headphones, Tablet } from "lucide-react";

/*
 * Format choice on the book page: a radio group of cards (format, price, stock),
 * native radios underneath so arrow keys and screen readers work as expected.
 * Out-of-stock formats stay visible but can't be chosen.
 */

const DIGITAL = new Set(["ebook", "audiobook"]);

export function FormatPicker({ variants, value, onChange, name }: { variants: BookVariant[]; value: number | undefined; onChange: (id: number) => void; name: string }) {
  const { dict } = useT();
  const currency = useCurrency();
  return (
    <fieldset className={cn("detail-formats min-w-0", variants.length === 1 && "detail-single-format")}>
      <legend className="mb-3 text-sm font-semibold">{dict.cards.format}</legend>
      <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {variants.map((v) => {
          const selected = v.id === value;
          const available = v.in_stock !== false || Boolean(v.is_preorder || v.is_backorder);
          return (
            <label
              key={v.id}
              className={cn(
                "detail-format-option relative grid cursor-pointer gap-1 rounded-xl border p-4 transition-[background-color,border-color,box-shadow,transform] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                selected ? "border-primary bg-lapis-tint" : "border-border bg-card hover:border-input",
                !available && "cursor-not-allowed opacity-60",
              )}
            >
              <input type="radio" name={name} value={v.id} checked={selected} disabled={!available} onChange={() => v.id && onChange(v.id)} className="sr-only" />
              <span className="detail-format-icon text-primary">{v.format === "audiobook" ? <Headphones className="size-4" aria-hidden="true" /> : v.format === "ebook" ? <Tablet className="size-4" aria-hidden="true" /> : <BookOpen className="size-4" aria-hidden="true" />}</span>
              <span className={cn("text-[15px] font-semibold", selected && "text-primary")}>{formatName(dict, v.format)}</span>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(v.price_usd, v.price_khr, currency)}</span>
              <span className={cn("text-xs", available ? "text-muted-foreground" : "text-destructive")}>
                {!available ? dict.cards.outOfStock : v.is_preorder ? dict.preorder.preorderBadge : v.is_backorder ? dict.preorder.backorderBadge : DIGITAL.has(v.format ?? "") ? dict.cards.instant : dict.cards.inStock}
              </span>
              <span className="detail-format-check text-primary" aria-hidden="true">{selected ? <Check className="size-4" /> : <span className="block size-4 rounded-full border border-border" />}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
