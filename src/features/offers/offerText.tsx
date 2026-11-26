import { Tag } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import { SaleBadge } from "@/components/BookBadge";
import { orderDate } from "@/features/orders/format";
import { cn } from "@/lib/utils";
import { offerBadgeText, offerBookLineText, offerKind, offerNudgeText } from "./offerKind";
import { useT } from "@/i18n";

/*
 * Automatic offers ("Buy 2, save 15%") in the shop. The API sends numbers and the target's name only
 * (offers spec, Q6 A); the sentences are written here in English and Khmer. Every piece renders nothing
 * when the API has no offer fields yet, so the shop works on an API without offers too.
 */

type BookOffer = NonNullable<BookCard["offer"]> & { type?: string | null; amount_off?: string | null; bundle_price?: string | null };
/** Book card badge: "Buy 2, save 15%", "Buy 2, save $3" or "Any 5 for $20". */
export function OfferBadge({ offer, className }: { offer: BookOffer | null | undefined; className?: string }) {
  const { dict } = useT();
  const text = offerBadgeText(dict, offer);
  if (!offer || !text) return null;
  return <SaleBadge label={`${offer.ends_at ? `${dict.shopExtras.limited} · ` : ""}${text}`} className={className} />;
}

/** Book page line under the price: "Buy 2 from Sherlock Holmes, save 15%. Ends 15 Nov 2026." (+ a link to a bundle's books) */
export function BookOfferLine({ offer, className }: { offer: BookOffer | null | undefined; className?: string }) {
  const { dict, locale } = useT();
  const text = offerBookLineText(dict, offer, offer?.target_label ?? null);
  if (!offer || !text) return null;
  const o = dict.offers;
  return (
    <p className={cn("flex items-start gap-2 text-[15px] font-medium text-accent-text", className)}>
      <Tag className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        {text}
        {offer.free_delivery ? ` ${o.plusFreeDelivery}.` : null}
        {offer.ends_at ? ` ${o.ends(orderDate(offer.ends_at, locale))}` : null}
        {offerKind(offer) === "bundle" && offer.id ? (
          <>
            {" "}
            <Link to={`/offers/${offer.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
              {o.bundleSeeBooks}
            </Link>
          </>
        ) : null}
      </span>
    </p>
  );
}

type Nudge = {
  offer_id?: number;
  add_quantity?: number;
  percent_off?: string;
  type?: string | null;
  min_quantity?: number | null;
  amount_off?: string | null;
  bundle_price?: string | null;
  target_label?: string | null;
  whole_series?: boolean;
  free_delivery?: boolean;
} | null | undefined;

/** Cart nudge: "Add 1 more book from Sherlock Holmes to save 15%" + a link to those books. */
export function OfferNudge({ nudge, onNavigate, className }: { nudge: Nudge; onNavigate?: () => void; className?: string }) {
  const { dict } = useT();
  const label = nudge?.target_label ?? null;
  const text = nudge?.add_quantity ? offerNudgeText(dict, nudge, nudge.add_quantity, label) : null;
  if (!nudge || !text) return null;
  const o = dict.offers;
  const bundle = offerKind({ ...nudge, min_quantity: nudge.min_quantity ?? 2 }) === "bundle";
  const to = bundle && nudge.offer_id ? `/offers/${nudge.offer_id}` : label ? `/books?q=${encodeURIComponent(label)}` : "/books";
  return (
    <p className={cn("flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground", className)}>
      <Tag className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
      <span>
        {text}
        {nudge.free_delivery ? ` ${o.plusFreeDelivery}` : null}{" "}
        <Link
          to={to}
          onClick={onNavigate}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {o.seeBooks}
        </Link>
      </span>
    </p>
  );
}

/** Checkout/cart note when a valid coupon lost to the offer. */
export function CouponNotUsedNote({ code, className }: { code: string | null | undefined; className?: string }) {
  const { dict } = useT();
  if (!code) return null;
  return (
    <p className={cn("rounded-lg bg-lapis-tint px-3 py-2 text-sm text-primary", className)} role="status">
      {dict.offers.couponNotUsed(code)}
    </p>
  );
}
