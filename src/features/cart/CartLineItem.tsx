import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { CartLine } from "@/api/types";
import { CoverThumb } from "@/components/CoverThumb";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Button } from "@/components/ui/button";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatMoney, formatUsd, useCurrency } from "@/stores/currency";
import { isBlocking, isDigitalLine, maxQuantity } from "./cartIssues";

/*
 * One cart line: cover, title (link), format and unit price, quantity stepper
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
  const title = line.book?.title ?? "Book";
  const issues = line.issues ?? [];
  const blocked = issues.some(isBlocking);

  return (
    <li className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-3", busy && "opacity-60 transition-opacity")} aria-busy={busy || undefined}>
      <CoverThumb src={line.cover_image_url} className={compact ? "h-[72px] w-12" : "h-[108px] w-[72px]"} />
      <div className="grid min-w-0 gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/books/${line.book?.id}`} onClick={onNavigate} className={cn("line-clamp-2 font-semibold leading-snug text-foreground underline-offset-4 hover:underline", !compact && "font-display text-lg font-normal")}>
              {title}
            </Link>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatLabel(line.format)} · <span className="tabular-nums">{formatMoney(line.unit_price_usd, line.unit_price_khr, currency)}</span> each
            </p>
          </div>
          <p className={cn("shrink-0 font-semibold tabular-nums", blocked && "text-muted-foreground line-through")}>{formatMoney(line.line_total_usd, line.line_total_khr, currency)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDigitalLine(line) ? (
            <p className="text-sm text-muted-foreground">Qty 1 · digital</p>
          ) : (
            <QuantityStepper
              value={line.quantity ?? 1}
              max={maxQuantity(line)}
              onChange={(quantity) => quantity !== line.quantity && onQuantity(line, quantity)}
              label={`Quantity for ${title}`}
              disabled={busy}
            />
          )}
          <Button variant="ghost" size={compact ? "icon" : "sm"} onClick={() => onRemove(line)} disabled={busy} aria-label={`Remove ${title} from your cart`} className="text-muted-foreground hover:text-destructive">
            <Trash2 aria-hidden="true" />
            {compact ? null : "Remove"}
          </Button>
        </div>

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
              {issue.code === "price_changed" && issue.previous_price_usd ? ` (was ${formatUsd(issue.previous_price_usd)})` : null}
            </span>
          </p>
        ))}
      </div>
    </li>
  );
}
