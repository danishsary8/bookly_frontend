import { ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CoverStack } from "@/components/shopping/CoverStack";
import { OfferNudge } from "@/features/offers/offerText";
import { PromoReminder } from "@/features/promotions/PromoReminder";
import { RewardNudge } from "@/features/rewards/RewardBits";
import { CartGate } from "@/features/cart/CartGate";
import { CartLineItem } from "@/features/cart/CartLineItem";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { cartTotals } from "@/features/offers/cartTotals";
import { offerLineText } from "@/features/offers/offerLineText";
import { useCartMutations, useUsableCart } from "@/features/cart/useCart";
import { buttonVariants } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { closeShellPanel, openShellPanel, useShellPanel } from "@/stores/shell";
import { useT } from "@/i18n";

/*
 * MASTER §6.19 cart drawer, Cart v2 (pages/shopping.md): every state (signed out, unverified, loading, error, empty)
 * and editable lines (quantity, remove with undo, the API's issues). Above the lines: the free-delivery bar and the
 * offer nudge. Empty: a fan of popular covers. Footer: the live promotion, the offer's saving, the total, one
 * full-width Checkout (disabled while an issue blocks it) and a quieter View cart. Coupons live on the cart page.
 */

function DrawerEmpty() {
  const { dict } = useT();
  const t = dict.shell;
  const popular = useQuery(catalogQueries.recommendations({ cart_ids: undefined, limit: 6 }));
  const covers = (popular.data ?? []).filter((b) => b.cover_image_url).map((b) => ({ src: b.cover_image_url, title: b.title }));
  return (
    <div className="group grid justify-items-center gap-3 px-2 py-10 text-center">
      {covers.length >= 3 ? (
        <CoverStack items={covers} size="md" max={5} className="mb-3" />
      ) : (
        <span className="mb-2 grid size-20 place-items-center rounded-full bg-lapis-tint text-primary">
          <ShoppingBag className="size-9" strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      <h3 className="font-display text-[1.563rem] leading-tight">{t.cartEmpty}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{t.cartEmptyLead}</p>
      <Link to="/books" onClick={closeShellPanel} className={cn(buttonVariants({ variant: "default" }), "mt-2")}>
        {t.browseBooks} <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}

function CartBody() {
  const { cart } = useUsableCart();
  const mutations = useCartMutations();
  const { dict } = useT();
  const t = dict.shell;

  if (cart.isPending) {
    return (
      <SkeletonGroup label={t.loadingCart} className="grid gap-5">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </SkeletonGroup>
    );
  }

  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => cart.refetch()} headingLevel="h3" showHomeLink={false} />;

  const items = cart.data.items ?? [];
  if (items.length === 0) return <DrawerEmpty />;
  // The offer only (no coupon here: the coupon is checked on the cart page). Older API: plain subtotal, as before.
  const totals = cartTotals(cart.data, null);

  return (
    <div className="grid gap-4">
      {totals.freeShipping === null ? null : (
        <FreeShippingBar subtotalUsd={totals.totalBeforeShipping.usd} thresholdUsd={totals.freeShipping?.threshold_usd} free={totals.freeShipping?.is_free} />
      )}
      <OfferNudge nudge={cart.data.pricing?.nudge} onNavigate={closeShellPanel} />
      <RewardNudge reward={cart.data.reward} className="px-1" />
      <ul className="grid [&>li]:py-5 [&>li:first-child]:pt-1 [&>li+li]:border-t [&>li+li]:border-border" aria-label={t.cartItems}>
        {items.map((line) => (
          <CartLineItem key={line.id} line={line} compact busy={mutations.busyLineId === line.id} onQuantity={mutations.setQuantity} onRemove={mutations.remove} onNavigate={closeShellPanel} />
        ))}
      </ul>
    </div>
  );
}

function CartSummary() {
  const { session, verified, cart } = useUsableCart();
  const currency = useCurrency();
  const { dict } = useT();
  const t = dict.shell;
  if (!session || !verified || !cart.data?.items?.length) return null;
  const totals = cartTotals(cart.data, null);
  const blocked = cart.data.can_checkout === false;

  return (
    <DrawerFooter className="grid gap-3">
      <PromoReminder onNavigate={closeShellPanel} />
      {totals.discount?.kind === "offer" ? (
        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-success-tint px-3 py-2 text-sm font-medium text-success">
          <span>{offerLineText(dict, totals.discount.offer)}</span>
          <span className="tabular-nums">−{formatMoney(totals.discount.amount.usd, totals.discount.amount.khr, currency)}</span>
        </div>
      ) : null}
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{totals.discount ? dict.cartPage.totalBeforeShipping : t.subtotal}</span>
        <span className="font-display text-[1.75rem] leading-none tabular-nums">{formatMoney(totals.totalBeforeShipping.usd, totals.totalBeforeShipping.khr, currency)}</span>
      </div>
      <p className="-mt-1 text-sm text-muted-foreground">{blocked ? t.fixItems : t.worksOutAtCheckout}</p>
      <Link
        to="/checkout"
        onClick={closeShellPanel}
        aria-disabled={blocked || undefined}
        tabIndex={blocked ? -1 : undefined}
        className={cn(buttonVariants({ variant: "cta", size: "lg" }), "w-full", blocked && "pointer-events-none opacity-40")}
      >
        {t.checkout} <ArrowRight aria-hidden="true" />
      </Link>
      <Link to="/cart" onClick={closeShellPanel} className={cn(buttonVariants({ variant: "ghost" }), "w-full text-primary")}>
        {t.viewCart}
      </Link>
    </DrawerFooter>
  );
}

export function CartDrawer() {
  const panel = useShellPanel();
  const { session, verified, cart } = useUsableCart();
  const count = session && verified ? (cart.data?.item_count ?? 0) : 0;
  const { dict } = useT();

  return (
    <Drawer open={panel === "cart"} onOpenChange={(open) => (open ? openShellPanel("cart") : closeShellPanel())}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle>
            {dict.shell.yourCart}{count > 0 ? <span className="font-sans text-base font-semibold text-muted-foreground"> ({count})</span> : null}
          </DrawerTitle>
          <DrawerDescription className="sr-only">{dict.shell.cartDescription}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <CartGate headingLevel="h3" onNavigate={closeShellPanel}>
            <CartBody />
          </CartGate>
        </DrawerBody>
        <CartSummary />
      </DrawerContent>
    </Drawer>
  );
}
