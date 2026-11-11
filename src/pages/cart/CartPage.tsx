import { useState } from "react";
import { AlertTriangle, ArrowRight, ShoppingBag } from "lucide-react";
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
import { percentLabel } from "@/features/offers/percent";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useRecentlyViewed } from "@/stores/recentlyViewed";
import { useT } from "@/i18n";
import { FreeGiftLine } from "@/features/offers/FreeGiftLine";

/*
 * /cart (pages/shopping.md): the page sits on the home page's warm paper, with the checkout rail beside the title.
 * Editable lines on one card on the left (7/12); on the right a sticky summary: the cart's covers, delivery fee and
 * date with the free-delivery progress, coupon, totals (the total in display type), "Continue to checkout" (the
 * page's one vermilion CTA, disabled while an issue blocks checkout) and three plain promises. Shipping and the
 * final total come from the checkout preview. An automatic offer (offers spec 6.1) shows as one discount line
 * (never stacked with a coupon), with a nudge above the summary. Empty: a fan of popular covers and Browse books.
 */

function Summary() {
  const currency = useCurrency();
  const { dict } = useT();
  const c = dict.cartPage;
  const { cart } = useUsableCart();
  const coupon = useCoupon();
  const [check, setCheck] = useState<CouponCheck | null>(null);
  const data = cart.data!;
  const totals = cartTotals(data, coupon && check ? check : null);
  const discount = totals.discount;
  const blocked = data.can_checkout === false;
  // Changes whenever lines or quantities change, so the coupon is re-checked.
  const cartVersion = (data.items ?? []).map((i) => `${i.id}:${i.quantity}`).join(",") + `|${data.subtotal_usd}`;

  return (
    <aside aria-labelledby="summary-title" className="shop-card grid gap-4 rounded-2xl border border-border bg-card p-5 short:gap-3 short:py-4 sm:px-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
      <FreeGiftLine gift={data.free_gift} />
      <div className="group flex items-end justify-between gap-4">
        <div>
          <h2 id="summary-title" className="font-display text-[1.563rem] leading-tight">
            {c.summary}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.items(data.item_count ?? 0)}</p>
        </div>
        <CoverStack items={(data.items ?? []).map((l) => ({ src: l.cover_image_url, title: l.book?.title }))} size="sm" />
      </div>
      <OfferNudge nudge={data.pricing?.nudge} />
      <CartDeliveryEstimate version={cartVersion} coupon={coupon} />
      <CouponField cartVersion={cartVersion} onChecked={setCheck} />
      <CouponNotUsedNote code={totals.couponNotUsed} />
      <dl className="grid gap-1.5 border-t border-border pt-3 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{c.subtotalItems(data.item_count ?? 0)}</dt>
          <dd className="tabular-nums">{formatMoney(data.subtotal_usd, data.subtotal_khr, currency)}</dd>
        </div>
        {discount ? (
          <div className="flex justify-between gap-4 text-success">
            <dt>
              {discount.kind === "offer"
                ? dict.offers.offerLine(discount.offer.min_quantity ?? 0, percentLabel(discount.offer.percent_off))
                : c.discountCode(discount.code)}
            </dt>
            <dd className="tabular-nums">−{formatMoney(discount.amount.usd, discount.amount.khr, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{c.shipping}</dt>
          <dd className="text-muted-foreground">{c.atCheckout}</dd>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">{c.totalBeforeShipping}</dt>
          <dd className="font-display text-[2rem] leading-none tabular-nums">{formatMoney(totals.totalBeforeShipping.usd, totals.totalBeforeShipping.khr, currency)}</dd>
        </div>
      </dl>
      {blocked ? (
        <p className="flex items-start gap-2 rounded-md bg-destructive-tint px-3 py-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {c.blocked}
        </p>
      ) : null}
      <CtaGlare block>
        <Link
          to="/checkout"
          aria-disabled={blocked || undefined}
          tabIndex={blocked ? -1 : undefined}
          className={cn(buttonVariants({ variant: "cta", size: "lg" }), "w-full", blocked && "pointer-events-none opacity-40")}
        >
          {dict.cart.checkout} <ArrowRight aria-hidden="true" />
        </Link>
      </CtaGlare>
      <TrustRow />
    </aside>
  );
}

function CartContents() {
  const { cart } = useUsableCart();
  const { dict } = useT();
  const c = dict.cartPage;
  const mutations = useCartMutations();
  const [confirmClear, setConfirmClear] = useState(false);

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
  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <section aria-labelledby="lines-title" className="shop-card overflow-hidden rounded-2xl border border-border bg-card lg:col-span-7 xl:col-span-8">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-7">
          <h2 id="lines-title" className="font-display text-[1.375rem] leading-tight">
            {c.items(cart.data.item_count ?? 0)}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} disabled={mutations.clearing} className="text-muted-foreground">
            {c.emptyCart}
          </Button>
        </div>
        <ul className="grid px-5 sm:px-7 [&>li]:py-6 [&>li+li]:border-t [&>li+li]:border-border" aria-label={c.cartItems}>
          {items.map((line) => (
            <CartLineItem key={line.id} line={line} busy={mutations.busyLineId === line.id} onQuantity={mutations.setQuantity} onRemove={mutations.remove} />
          ))}
        </ul>
      </section>
      <div className="lg:col-span-5 xl:col-span-4">
        <Summary />
      </div>
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
          className="pb-6 sm:pt-6 short:gap-2 short:pb-4 short:pt-3 short:[&_h1]:text-[2.6rem]"
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
