import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BadgePercent, ShieldCheck, ShoppingBag, TicketPercent } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { CouponCheck } from "@/api/types";
import { BookShelf } from "@/components/catalog/BookShelf";
import { CartDeliveryEstimate } from "@/features/cart/CartDeliveryEstimate";
import { PageHeader } from "@/components/catalog/PageHeader";
import { CtaGlare } from "@/components/CtaGlare";
import { CheckoutProgress } from "@/components/shopping/CheckoutProgress";
import { CoverStack } from "@/components/shopping/CoverStack";
import { TrustRow } from "@/components/shopping/TrustRow";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { CartGate } from "@/features/cart/CartGate";
import { CartLineItem } from "@/features/cart/CartLineItem";
import { CouponField } from "@/features/cart/CouponField";
import { setCoupon, useCoupon } from "@/features/cart/couponStore";
import { useCartMutations, useUsableCart } from "@/features/cart/useCart";
import { cartTotals } from "@/features/offers/cartTotals";
import { CouponNotUsedNote, OfferNudge } from "@/features/offers/offerText";
import { offerLineText } from "@/features/offers/offerLineText";
import { PromoReminder } from "@/features/promotions/PromoReminder";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useRecentlyViewed } from "@/stores/recentlyViewed";
import { useT } from "@/i18n";
import { FreeGiftLine } from "@/features/offers/FreeGiftLine";

/*
 * /cart, Cart v2 (pages/shopping.md): the page sits on the home page's warm paper, with the checkout rail beside the
 * title. Left: one card of editable lines with a green "you're saving" strip, the live promotion reminder and a
 * footer (Keep shopping, subtotal). Right: a sticky summary shaped like a receipt: a lapis head (title, count, covers),
 * then the offer nudge, delivery estimate and free-delivery bar, the coupon (behind "Have a coupon code?" until used),
 * the sums, a perforated tear, the total in display type with a "You save" chip, the page's one vermilion CTA
 * (disabled while an issue blocks checkout), a "nothing is charged now" note and the three promises. Laptops under
 * 820px tall (`short:`) get a tighter receipt so the CTA is on the first screen at 1366x768. Below `lg` a fixed bar
 * (total + checkout) shows until the summary's own button scrolls into view; the page and the support bubble make room.
 */

type Totals = ReturnType<typeof cartTotals>;

function useCartTotals(check: CouponCheck | null): Totals | null {
  const { cart } = useUsableCart();
  const coupon = useCoupon();
  return cart.data ? cartTotals(cart.data, coupon && check ? check : null) : null;
}

function Summary({ check, setCheck, ctaRef }: { check: CouponCheck | null; setCheck: (c: CouponCheck | null) => void; ctaRef: React.Ref<HTMLAnchorElement> }) {
  const currency = useCurrency();
  const { dict } = useT();
  const c = dict.cartPage;
  const { cart } = useUsableCart();
  const coupon = useCoupon();
  const [couponOpen, setCouponOpen] = useState(false);
  const data = cart.data!;
  const totals = cartTotals(data, coupon && check ? check : null);
  const discount = totals.discount;
  const blocked = data.can_checkout === false;
  const freeDelivery = totals.freeShipping?.is_free === true;
  // Changes whenever lines or quantities change, so the coupon is re-checked.
  const cartVersion = (data.items ?? []).map((i) => `${i.id}:${i.quantity}`).join(",") + `|${data.subtotal_usd}`;
  const showCoupon = Boolean(coupon) || couponOpen;

  useEffect(() => {
    if (couponOpen && !coupon) document.getElementById("coupon-code")?.focus();
  }, [couponOpen, coupon]);

  return (
    <aside aria-labelledby="summary-title" className="shop-card overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
      <div className="group flex items-end justify-between gap-4 bg-lapis px-5 pb-3 pt-3.5 text-on-lapis short:py-2.5 sm:px-6">
        <div className="min-w-0">
          <h2 id="summary-title" className="font-display text-[1.563rem] leading-tight short:text-[1.375rem]">
            {c.summary}
          </h2>
          <p className="mt-0.5 text-sm text-on-lapis-muted">{c.items(data.item_count ?? 0)}</p>
        </div>
        <CoverStack items={(data.items ?? []).map((l) => ({ src: l.cover_image_url, title: l.book?.title }))} size="sm" />
      </div>

      <div className="grid gap-3 px-5 pb-1 pt-4 short:gap-2 short:pt-2.5 sm:px-6">
        <FreeGiftLine gift={data.free_gift} />
        <OfferNudge nudge={data.pricing?.nudge} />
        <CartDeliveryEstimate version={cartVersion} coupon={coupon} className="short:gap-2" barClassName="short:gap-1.5 short:p-2.5" />
        {showCoupon ? (
          <div id="cart-coupon">
            <CouponField cartVersion={cartVersion} onChecked={setCheck} />
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={false}
            aria-controls="cart-coupon"
            onClick={() => setCouponOpen(true)}
            className="-my-1 inline-flex min-h-11 items-center gap-2 justify-self-start rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-9"
          >
            <TicketPercent className="size-4" aria-hidden="true" /> {c.haveCoupon}
          </button>
        )}
        <CouponNotUsedNote code={totals.couponNotUsed} />
        <dl className="grid gap-1.5 border-t border-border pt-3 text-[15px] short:gap-1 short:pt-2.5">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{c.subtotalItems(data.item_count ?? 0)}</dt>
            <dd className="tabular-nums">{formatMoney(data.subtotal_usd, data.subtotal_khr, currency)}</dd>
          </div>
          {discount ? (
            <div className="flex justify-between gap-4 text-success">
              <dt>{discount.kind === "offer" ? offerLineText(dict, discount.offer) : c.discountCode(discount.code)}</dt>
              <dd className="tabular-nums">−{formatMoney(discount.amount.usd, discount.amount.khr, currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{c.shipping}</dt>
            {freeDelivery ? <dd className="font-semibold text-success">{c.free}</dd> : <dd className="text-muted-foreground">{c.atCheckout}</dd>}
          </div>
        </dl>
      </div>

      <div className="receipt-tear my-1 short:my-0" aria-hidden="true">
        <span />
      </div>

      <div className="grid gap-3 px-5 pb-5 short:gap-2 short:pb-3 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="grid gap-1">
            <p className="font-semibold">{c.totalBeforeShipping}</p>
            {discount?.amount.usd && Number(discount.amount.usd) > 0 ? (
              <span className="justify-self-start rounded-full bg-success-tint short:hidden px-2.5 py-0.5 text-xs font-semibold text-success">
                {c.savedShort(formatMoney(discount.amount.usd, discount.amount.khr, currency))}
              </span>
            ) : null}
          </div>
          <p className="font-display text-[2.25rem] leading-none tabular-nums short:text-[1.85rem]" aria-live="polite">
            {formatMoney(totals.totalBeforeShipping.usd, totals.totalBeforeShipping.khr, currency)}
          </p>
        </div>
        {blocked ? (
          <p className="flex items-start gap-2 rounded-md bg-destructive-tint px-3 py-2 text-sm text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {c.blocked}
          </p>
        ) : null}
        <CtaGlare block>
          <Link
            ref={ctaRef}
            to="/checkout"
            aria-disabled={blocked || undefined}
            tabIndex={blocked ? -1 : undefined}
            className={cn(buttonVariants({ variant: "cta", size: "lg" }), "w-full", blocked && "pointer-events-none opacity-40")}
          >
            {dict.cart.checkout} <ArrowRight aria-hidden="true" />
          </Link>
        </CtaGlare>
        <p className="-mt-1 flex items-start gap-2 text-sm text-muted-foreground short:hidden">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          {c.payNote}
        </p>
        <TrustRow className="short:hidden" />
      </div>
    </aside>
  );
}

/* Below lg: total + checkout pinned to the bottom until the summary's own button is on screen. */
function StickyCheckoutBar({ totals, visible, barRef }: { totals: Totals; visible: boolean; barRef: React.Ref<HTMLDivElement> }) {
  const { dict } = useT();
  const currency = useCurrency();
  const { cart } = useUsableCart();
  const blocked = cart.data?.can_checkout === false;
  return (
    <div
      ref={barRef}
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-header) border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm transition-transform duration-(--dur-toggle) ease-(--ease-standard) motion-reduce:transition-none lg:hidden",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{dict.cartPage.stickyTotal(cart.data?.item_count ?? 0)}</p>
          <p className="font-display text-[1.4rem] leading-tight tabular-nums">{formatMoney(totals.totalBeforeShipping.usd, totals.totalBeforeShipping.khr, currency)}</p>
        </div>
        <Link
          to="/checkout"
          aria-disabled={blocked || undefined}
          tabIndex={blocked ? -1 : undefined}
          className={cn(buttonVariants({ variant: "cta" }), "shrink-0", blocked && "pointer-events-none opacity-40")}
        >
          {dict.cart.checkout} <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/* Shows the bar while the summary's button is below the screen (never at lg and up). Writes the bar's height to
   --bottom-bar on <html> so the page's padding and the support bubble can make room. */
function useStickyBar() {
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cta = ctaRef.current;
    if (!cta || typeof IntersectionObserver === "undefined") return;
    const wide = window.matchMedia("(min-width: 1024px)");
    let below = false;
    const update = () => setVisible(below && !wide.matches);
    const io = new IntersectionObserver(([entry]) => {
      below = !entry.isIntersecting && entry.boundingClientRect.top > 0;
      update();
    });
    io.observe(cta);
    wide.addEventListener("change", update);
    return () => {
      io.disconnect();
      wide.removeEventListener("change", update);
    };
  });

  useEffect(() => {
    const root = document.documentElement;
    if (!visible || !barRef.current) {
      root.style.removeProperty("--bottom-bar");
      return;
    }
    root.style.setProperty("--bottom-bar", `${barRef.current.offsetHeight}px`);
    return () => {
      root.style.removeProperty("--bottom-bar");
    };
  }, [visible]);

  return { ctaRef, barRef, visible };
}

function CartContents() {
  const { cart } = useUsableCart();
  const currency = useCurrency();
  const { dict } = useT();
  const c = dict.cartPage;
  const mutations = useCartMutations();
  const [confirmClear, setConfirmClear] = useState(false);
  const [check, setCheck] = useState<CouponCheck | null>(null);
  const totals = useCartTotals(check);
  const bar = useStickyBar();

  if (cart.isPending) {
    return (
      <SkeletonGroup label={c.loading} className="grid gap-6">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </SkeletonGroup>
    );
  }
  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => cart.refetch()} />;

  const items = cart.data.items ?? [];
  if (items.length === 0 || !totals) return <EmptyCart />;
  const saved = totals.discount && Number(totals.discount.amount.usd) > 0 ? totals.discount.amount : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 max-lg:pb-[var(--bottom-bar,0px)] lg:grid-cols-12 lg:gap-10">
      <section aria-labelledby="lines-title" className="shop-card overflow-hidden rounded-2xl border border-border bg-card lg:col-span-7 xl:col-span-8">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-7">
          <h2 id="lines-title" className="font-display text-[1.375rem] leading-tight">
            {c.items(cart.data.item_count ?? 0)}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} disabled={mutations.clearing} className="text-muted-foreground">
            {c.emptyCart}
          </Button>
        </div>
        {saved ? (
          <p className="flex items-center gap-2.5 border-b border-success/20 bg-success-tint px-5 py-2.5 text-sm font-semibold text-success sm:px-7" role="status">
            <BadgePercent className="size-[18px] shrink-0" aria-hidden="true" />
            {c.offerSaved(formatMoney(saved.usd, saved.khr, currency))}
          </p>
        ) : null}
        <PromoReminder className="mx-5 mt-4 sm:mx-7" />
        <ul className="grid px-5 sm:px-7 [&>li]:py-6 [&>li+li]:border-t [&>li+li]:border-border" aria-label={c.cartItems}>
          {items.map((line) => (
            <CartLineItem key={line.id} line={line} busy={mutations.busyLineId === line.id} onQuantity={mutations.setQuantity} onRemove={mutations.remove} />
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-1 px-5 py-3 sm:px-7">
          <Link to="/books" className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" /> {c.keepShopping}
          </Link>
          <p className="text-sm text-muted-foreground">
            {c.subtotalItems(cart.data.item_count ?? 0)}{" "}
            <span className="font-semibold tabular-nums text-foreground">{formatMoney(cart.data.subtotal_usd, cart.data.subtotal_khr, currency)}</span>
          </p>
        </div>
      </section>
      <div className="lg:col-span-5 xl:col-span-4">
        <Summary check={check} setCheck={setCheck} ctaRef={bar.ctaRef} />
      </div>
      <StickyCheckoutBar totals={totals} visible={bar.visible} barRef={bar.barRef} />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={c.emptyTitle}
        description={c.emptyDialogLead}
        confirmLabel={c.emptyCart}
        loading={mutations.clearing}
        onConfirm={() => {
          mutations.clear();
          setCoupon(null);
          setConfirmClear(false);
        }}
      />
    </div>
  );
}

/* Empty cart: popular covers fanned out above the message. The same recommendations query as the row below the
   cart (so no extra request); without covers, just the message. */
function EmptyCart() {
  const { dict } = useT();
  const c = dict.cartPage;
  const popular = useQuery(catalogQueries.recommendations({ cart_ids: undefined, limit: 6 }));
  const covers = (popular.data ?? []).filter((b) => b.cover_image_url).map((b) => ({ src: b.cover_image_url, title: b.title }));
  return (
    <section aria-labelledby="empty-cart-title" className="shop-card group mx-auto grid max-w-2xl justify-items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center sm:px-12">
      {covers.length >= 3 ? (
        <CoverStack items={covers} size="lg" max={5} className="mb-2" />
      ) : (
        <span className="mb-2 grid size-24 place-items-center rounded-full bg-lapis-tint text-primary">
          <ShoppingBag className="size-11" strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      <h2 id="empty-cart-title" className="font-display text-[1.953rem] leading-tight">
        {dict.cart.empty}
      </h2>
      <p className="max-w-md text-muted-foreground">{c.emptyLead}</p>
      <Link to="/books" className={cn(buttonVariants({ size: "lg" }), "mt-2")}>
        {dict.cart.continueShopping} <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

function CartRecommendations() {
  const { dict } = useT();
  const { cart } = useUsableCart();
  const items = cart.data?.items ?? [];
  const bookIds = items.map((i) => i.book?.id).filter((id): id is number => typeof id === "number" && id > 0);
  const cartIdsParam = bookIds.join(",");

  const recommendations = useQuery(
    catalogQueries.recommendations({
      cart_ids: cartIdsParam || undefined,
      limit: 6,
    })
  );

  const books = recommendations.data ?? [];
  if (!books.length && !recommendations.isPending) return null;

  return (
    <BookShelf
      id="cart-recommendations"
      eyebrow={dict.cartPage.recommendedEyebrow}
      title={bookIds.length ? dict.cartPage.recommendedWithOrder : dict.cartPage.popularPicks}
      books={books}
      loading={recommendations.isPending}
      className="mt-20"
    />
  );
}

export default function CartPage() {
  const { dict } = useT();
  useDocumentTitle(dict.cart.title);
  const recent = useRecentlyViewed();
  const { cart } = useUsableCart();
  const count = cart.data?.items?.length ? (cart.data.item_count ?? 0) : 0;
  return (
    <div className="overflow-x-clip pb-20">
      <div className="container-shell">
        <PageHeader
          crumbs={[{ label: dict.cartPage.home, to: "/" }, { label: dict.nav.cart }]}
          title={dict.cart.title}
          aside={count ? <CheckoutProgress current="cart" /> : undefined}
          className="pb-6 sm:pt-6 short:gap-1.5 short:pb-2.5 short:pt-2 short:[&_h1]:text-[2.4rem]"
        />
        <CartGate headingLevel="h2">
          <CartContents />
        </CartGate>
        <CartRecommendations />
        {recent.length > 0 ? (
          <BookShelf id="cart-recent" eyebrow={dict.cartPage.yourHistory} title={dict.cartPage.recentlyViewed} books={recent.slice(0, 8)} className="mt-20" />
        ) : null}
      </div>
    </div>
  );
}
