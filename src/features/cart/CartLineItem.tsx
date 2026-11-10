import { AlertTriangle, Info, Tag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { CartLine } from "@/api/types";
import { CoverThumb } from "@/components/CoverThumb";
import { LowStockBadge } from "@/components/BookBadge";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney, formatUsd, useCurrency } from "@/stores/currency";
import { isBlocking, isDigitalLine, maxQuantity } from "./cartIssues";
import { formatName, useT } from "@/i18n";

/*
 * One cart line (pages/shopping.md): a real cover with the BookCard spine and gloss (lifts on hover), title
 * (link, display type on the cart page), a format chip and unit price, quantity stepper
 * (ebooks/audiobooks are one per order, so no stepper), remove, line total, and
 * the API's issues for the line: blocking ones in the destructive tint, a price
 * change as information with the old price.
 */

type Props = {
  line: CartLine;
  onQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
  busy?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
};

export function CartLineItem({ line, onQuantity, onRemove, busy, compact, onNavigate }: Props) {
  const currency = useCurrency();
  const { dict } = useT();
  const c = dict.cartPage;
  const title = line.book?.title ?? c.book;
  const issues = line.issues ?? [];
  const blocked = issues.some(isBlocking);

  const cover = (
    <span className="relative block overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgb(20_16_10/0.1),0_16px_26px_-16px_rgb(20_16_10/0.55)] transition-transform duration-300 ease-out group-hover/line:-translate-y-1 motion-reduce:transform-none">
      <CoverThumb src={line.cover_image_url} className={compact ? "h-[78px] w-[52px]" : "h-[132px] w-[88px]"} />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.2)_0_3%,rgb(255_255_255/0.16)_4%,transparent_10%),linear-gradient(120deg,rgb(255_255_255/0.12),transparent_45%)]" aria-hidden="true" />
    </span>
  );

  return (
    <li className={cn("group/line grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 sm:gap-x-5", busy && "opacity-60 transition-opacity")} aria-busy={busy || undefined}>
      {line.book?.id ? (
        <Link to={`/books/${line.book.id}`} onClick={onNavigate} tabIndex={-1} aria-hidden="true" className="self-start">
          {cover}
        </Link>
      ) : (
        <span className="self-start">{cover}</span>
      )}
      <div className={cn("grid min-w-0 content-between gap-3", !compact && "py-0.5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to={`/books/${line.book?.id}`} onClick={onNavigate} className={cn("line-clamp-2 leading-snug text-foreground underline-offset-4 hover:underline", compact ? "font-semibold" : "font-display text-[1.3rem]")}>
              {title}
            </Link>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{formatName(dict, line.format)}</span>
              <span>
                <span className="tabular-nums">{formatMoney(line.unit_price_usd, line.unit_price_khr, currency)}</span> {c.each}
              </span>
            </p>
            {line.in_offer || line.low_stock_remaining ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {line.in_offer ? (
                  <p className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent-text">
                    <Tag className="size-3" aria-hidden="true" /> {dict.offers.inOffer}
                  </p>
                ) : null}
                {line.low_stock_remaining ? <LowStockBadge remaining={line.low_stock_remaining} /> : null}
              </div>
            ) : null}
          </div>
          <p className={cn("shrink-0 text-right tabular-nums", compact ? "font-semibold" : "font-display text-[1.45rem] leading-none", blocked && "text-muted-foreground line-through")}>
            {formatMoney(line.line_total_usd, line.line_total_khr, currency)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDigitalLine(line) ? (
            <p className="text-sm text-muted-foreground">{c.digital}</p>
          ) : (
            <QuantityStepper
              value={line.quantity ?? 1}
              max={maxQuantity(line)}
              onChange={(quantity) => quantity !== line.quantity && onQuantity(line, quantity)}
              label={c.quantityFor(title)}
              disabled={busy}
            />
          )}
          <Button variant="ghost" size={compact ? "icon" : "sm"} onClick={() => onRemove(line)} disabled={busy} aria-label={c.removeFrom(title)} className="text-muted-foreground hover:text-destructive">
            <Trash2 aria-hidden="true" />
            {compact ? null : c.remove}
          </Button>
        </div>
      </div>

      {issues.length ? (
        <div className="col-span-2 grid gap-2">
          {issues.map((issue) => (
            <p
              key={issue.code}
              className={cn(
                "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                isBlocking(issue) ? "bg-destructive-tint text-destructive" : "bg-lapis-tint text-primary",
              )}
            >
              {isBlocking(issue) ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <span>
                {issue.message}
                {issue.code === "price_changed" && issue.previous_price_usd ? c.was(formatUsd(issue.previous_price_usd)) : null}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </li>
  );
}
