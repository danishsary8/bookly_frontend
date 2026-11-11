import { useState } from "react";
import { Clock, Gift, Loader2, Sparkles, Truck } from "lucide-react";
import type { SeriesDetail } from "@/api/types";
import { percentLabel } from "./percent";
import { orderDate } from "@/features/orders/format";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * The set offer on a series (book page volume box and series page; owner 2026-11-12): "Buy the full set, save 20%",
 * the set price beside the crossed-out full price, what you save, free delivery when the offer gives it, when it ends,
 * and one button that puts every volume in the cart. Numbers come from GET /series/{id} `set_offer`; renders nothing
 * without one. Facts only: the end date and the saving are the API's.
 */

const DAY = 86_400_000;

export function SetOfferBanner({ offer, onAdd, pending, className }: { offer: SeriesDetail["set_offer"]; onAdd: () => void; pending: boolean; className?: string }) {
  const { dict, locale } = useT();
  const currency = useCurrency();
  const o = dict.offers;
  const [now] = useState(() => Date.now()); // the time this banner was first shown (render stays pure)
  if (!offer?.percent_off) return null;
  const ends = offer.ends_at ? new Date(offer.ends_at) : null;
  const daysLeft = ends ? Math.floor((ends.getTime() - now) / DAY) : null;

  return (
    <div className={cn("hero-lapis relative isolate overflow-hidden rounded-xl p-1.5", className)}>
      <div className="promise-frame grid gap-4 rounded-lg px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            <Gift className="size-4" aria-hidden="true" /> {dict.shopExtras.limited}
          </p>
          <p className="mt-1.5 font-display text-[1.45rem] leading-tight text-on-lapis">{o.setTitle(percentLabel(offer.percent_off))}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-lapis-muted">
            <span>{o.setLead(offer.volumes ?? 0)}</span>
            {offer.free_delivery ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-on-lapis">
                <Truck className="size-4 text-gold" aria-hidden="true" /> {o.freeDelivery}
              </span>
            ) : null}
            {ends && daysLeft !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-gold" aria-hidden="true" />
                {daysLeft <= 7 ? o.endsIn(daysLeft) : o.ends(orderDate(offer.ends_at, locale))}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:justify-end">
          <p className="grid gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-lapis-muted">{o.setPrice}</span>
            <span className="flex items-baseline gap-2">
              <span className="font-display text-[1.7rem] leading-none tabular-nums text-on-lapis">{formatMoney(offer.set_price_usd, offer.set_price_khr, currency)}</span>
              <s className="text-sm tabular-nums text-on-lapis-muted">{formatMoney(offer.full_price_usd, offer.full_price_khr, currency)}</s>
            </span>
            <span className="text-[13px] font-semibold text-gold">{o.youSave(formatMoney(offer.saving_usd, offer.saving_khr, currency))}</span>
          </p>
          <button
            type="button"
            onClick={onAdd}
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#FBF6EC] px-5 text-sm font-semibold text-primary shadow-[0_14px_28px_-16px_rgb(0_0_0/0.7)] transition-[filter,transform] hover:brightness-105 active:scale-[0.97] disabled:opacity-70 motion-reduce:active:scale-100"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {o.getSet}
          </button>
        </div>
      </div>
    </div>
  );
}
