import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Gift, Truck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { promotionQueries, promotionsApi, promotionText, type Promotion } from "@/api/endpoints/promotions";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { percentLabel } from "@/features/offers/percent";
import { orderDate } from "@/features/orders/format";
import { promoStorage } from "./promoStorage";
import { useT } from "@/i18n";

/*
 * The shop's promotion pop-up (owner 2026-11-12), from GET /promotions/current. A lapis card in the hero's language:
 * gold eyebrow, the title, the text, what the linked offer gives (percent, free delivery), the dates and a live
 * countdown to the end, one button into the shop, and a "Don't show this again" tick box.
 * Shown once per visit, a moment after the splash has gone, never on the cart, checkout, payment or sign-in pages
 * (nothing interrupts paying). Ticking the box hides this promotion for good; the cart and checkout still carry a
 * small reminder (PromoReminder). Facts only: dates and numbers are the API's.
 */

const QUIET = /^\/(cart|checkout|orders|sign-in|sign-up|auth|account|admin|staff)/;
const OPEN_AFTER_MS = 1400;

export function PromoPopup() {
  const { pathname } = useLocation();
  const promotion = useQuery(promotionQueries.current()).data;
  const [open, setOpen] = useState(false);
  const quiet = QUIET.test(pathname);

  useEffect(() => {
    if (!promotion || quiet || !promoStorage.shouldShow(promotion.id)) return;
    // Wait for the splash to leave, then a short beat so the page is seen first.
    const timer = window.setInterval(() => {
      if (document.documentElement.hasAttribute("data-splash")) return;
      window.clearInterval(timer);
      window.setTimeout(() => {
        if (!promoStorage.shouldShow(promotion.id)) return;
        promoStorage.markSeen(promotion.id);
        void promotionsApi.view(promotion.id);
        setOpen(true);
      }, OPEN_AFTER_MS);
    }, 300);
    return () => window.clearInterval(timer);
  }, [promotion, quiet]);

  if (!promotion) return null;
  return <PromoDialog promotion={promotion} open={open} onClose={() => setOpen(false)} />;
}

function PromoDialog({ promotion, open, onClose }: { promotion: Promotion; open: boolean; onClose: () => void }) {
  const { dict, lang, locale } = useT();
  const t = dict.promo;
  const text = promotionText(promotion, lang);
  const [never, setNever] = useState(false);
  const close = () => {
    if (never) promoStorage.hideForGood(promotion.id);
    onClose();
  };
  const offer = promotion.offer;
  const dates = promotion.ends_at
    ? promotion.starts_at
      ? t.dates(orderDate(promotion.starts_at, locale), orderDate(promotion.ends_at, locale))
      : t.until(orderDate(promotion.ends_at, locale))
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent size="md" className="hero-lapis overflow-hidden border-0 p-2 text-on-lapis [&>button]:text-on-lapis [&>button:hover]:bg-on-lapis/10" aria-describedby={text.body ? "promo-body" : undefined}>
        <div className="promise-frame grid gap-5 rounded-lg px-6 pb-6 pt-7 sm:px-8">
          {promotion.image_url ? <img src={promotion.image_url} alt="" className="-mx-2 -mt-2 aspect-[16/7] w-[calc(100%+1rem)] max-w-none rounded-md object-cover" /> : null}
          <div className="grid gap-2 text-center">
            <p className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              <Gift className="size-4" aria-hidden="true" /> {t.eyebrow}
            </p>
            <DialogTitle className="text-balance font-display text-[clamp(1.7rem,4vw,2.3rem)] leading-[1.08] text-on-lapis">{text.title}</DialogTitle>
            {text.body ? (
              <DialogDescription id="promo-body" className="mx-auto max-w-prose text-[15px] leading-relaxed text-on-lapis-muted">
                {text.body}
              </DialogDescription>
            ) : null}
          </div>

          {offer ? (
            <ul className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold">
              <li className="inline-flex h-9 items-center rounded-full bg-gold/15 px-4 text-gold ring-1 ring-inset ring-gold/40">{t.percentOff(percentLabel(offer.percent_off))}</li>
              {offer.whole_series ? <li className="inline-flex h-9 items-center rounded-full bg-on-lapis/10 px-4 ring-1 ring-inset ring-on-lapis/20">{t.fullSet}</li> : null}
              {offer.free_delivery ? (
                <li className="inline-flex h-9 items-center gap-1.5 rounded-full bg-on-lapis/10 px-4 ring-1 ring-inset ring-on-lapis/20">
                  <Truck className="size-4 text-gold" aria-hidden="true" /> {t.freeDelivery}
                </li>
              ) : null}
            </ul>
          ) : null}

          {promotion.ends_at ? <Countdown endsAt={promotion.ends_at} /> : null}
          {dates ? (
            <p className="inline-flex items-center justify-center gap-2 text-[13px] text-on-lapis-muted">
              <CalendarDays className="size-4 text-gold" aria-hidden="true" /> {dates}
            </p>
          ) : null}

          <div className="grid justify-items-center gap-3">
            <Link
              to={promotion.cta_url}
              onClick={() => {
                void promotionsApi.click(promotion.id);
                close();
              }}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#FBF6EC] px-7 text-[15px] font-semibold text-primary shadow-[0_18px_36px_-18px_rgb(0_0_0/0.7)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] motion-reduce:active:scale-100"
            >
              {text.cta || t.shopNow} <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <button type="button" onClick={close} className="min-h-9 rounded-md px-3 text-sm font-medium text-on-lapis-muted underline-offset-4 hover:text-on-lapis hover:underline">
              {t.later}
            </button>
          </div>

          <label className="mx-auto flex min-h-9 cursor-pointer items-center gap-2.5 text-[13px] text-on-lapis-muted">
            <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} className="size-4 accent-[var(--gold)]" />
            {t.dontShow}
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Days, hours, minutes and seconds to the end; ticks once a second while the pop-up is open. */
function Countdown({ endsAt }: { endsAt: string }) {
  const { dict } = useT();
  const t = dict.promo;
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.floor((end - now) / 1000));
  if (Number.isNaN(end) || left <= 0) return null;
  const parts: Array<[number, string]> = [
    [Math.floor(left / 86_400), t.days],
    [Math.floor((left % 86_400) / 3600), t.hours],
    [Math.floor((left % 3600) / 60), t.minutes],
    [left % 60, t.seconds],
  ];
  return (
    <div className="grid justify-items-center gap-2" aria-hidden="true">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-lapis-muted">{t.endsIn}</p>
      <ol className="flex gap-2">
        {parts.map(([value, label]) => (
          <li key={label} className="grid w-[4.1rem] justify-items-center rounded-xl bg-black/25 py-2 ring-1 ring-inset ring-gold/25">
            <span className="font-display text-[1.7rem] leading-none tabular-nums text-on-lapis">{String(value).padStart(2, "0")}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-lapis-muted">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
