import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { CartGate } from "@/features/cart/CartGate";
import { CartLineItem } from "@/features/cart/CartLineItem";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { cartTotals } from "@/features/offers/cartTotals";
import { percentLabel } from "@/features/offers/percent";
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
 * MASTER §6.19 cart drawer (lines and totals restyled with the cart page, pages/shopping.md): every state (signed out, unverified, loading, error,
 * empty) and editable lines (quantity, remove with undo, the API's issues), then
 * the footer with subtotal, View cart and Checkout (disabled while an issue
 * blocks it). Coupons are applied on the cart page and at checkout.
 */


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
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        headingLevel="h3"
        title={t.cartEmpty}
        description={t.cartEmptyLead}
        action={
          <Link to="/books" onClick={closeShellPanel} className={buttonVariants({ variant: "default" })}>
            {t.browseBooks}
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid [&>li]:py-5 [&>li:first-child]:pt-1 [&>li+li]:border-t [&>li+li]:border-border" aria-label={t.cartItems}>
      {items.map((line) => (
        <CartLineItem key={line.id} line={line} compact busy={mutations.busyLineId === line.id} onQuantity={mutations.setQuantity} onRemove={mutations.remove} onNavigate={closeShellPanel} />
      ))}
    </ul>
  );
}

function CartSummary() {
  const { session, verified, cart } = useUsableCart();
  const currency = useCurrency();
  const { dict } = useT();
  const t = dict.shell;
  if (!session || !verified || !cart.data?.items?.length) return null;
  // The offer only (no coupon here: the coupon is checked on the cart page). Older API: plain subtotal, as before.
  const totals = cartTotals(cart.data, null);

  return (
    <DrawerFooter className="grid gap-4">
      {totals.freeShipping === null ? null : (
        <FreeShippingBar subtotalUsd={totals.totalBeforeShipping.usd} thresholdUsd={totals.freeShipping?.threshold_usd} />
      )}
      {totals.discount?.kind === "offer" ? (
        <div className="flex items-baseline justify-between gap-3 text-sm text-success">
          <span>{dict.offers.offerLine(totals.discount.offer.min_quantity ?? 0, percentLabel(totals.discount.offer.percent_off))}</span>
          <span className="tabular-nums">−{formatMoney(totals.discount.amount.usd, totals.discount.amount.khr, currency)}</span>
        </div>
      ) : null}
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{totals.discount ? dict.cartPage.totalBeforeShipping : t.subtotal}</span>
        <span className="font-display text-[1.75rem] leading-none tabular-nums">{formatMoney(totals.totalBeforeShipping.usd, totals.totalBeforeShipping.khr, currency)}</span>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        {cart.data.can_checkout === false ? t.fixItems : t.worksOutAtCheckout}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/cart" onClick={closeShellPanel} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          {t.viewCart}
        </Link>
        <Link
          to="/checkout"
          onClick={closeShellPanel}
          aria-disabled={cart.data.can_checkout === false || undefined}
          className={cn(buttonVariants({ variant: "cta" }), "w-full", cart.data.can_checkout === false && "pointer-events-none opacity-40")}
        >
          {t.checkout}
        </Link>
      </div>
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
