import { useState } from "react";
import { AlertTriangle, ArrowRight, ShoppingBag, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import type { CouponCheck } from "@/api/types";
import { BookShelf } from "@/components/catalog/BookShelf";
import { PageHeader } from "@/components/catalog/PageHeader";
import { CtaGlare } from "@/components/CtaGlare";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { CartGate } from "@/features/cart/CartGate";
import { CartLineItem } from "@/features/cart/CartLineItem";
import { CouponField } from "@/features/cart/CouponField";
import { setCoupon, useCoupon } from "@/features/cart/couponStore";
import { useCartMutations, useUsableCart } from "@/features/cart/useCart";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useRecentlyViewed } from "@/stores/recentlyViewed";

/*
 * /cart (MASTER 8/4 split): editable lines on the left; on the right a sticky
 * summary with the coupon, subtotal, discount and "Continue to checkout" (the
 * page's one vermilion CTA, disabled while an issue blocks checkout). Shipping
 * and the final total come from the checkout preview.
 */

function Summary() {
  const currency = useCurrency();
  const { cart } = useUsableCart();
  const coupon = useCoupon();
  const [check, setCheck] = useState<CouponCheck | null>(null);
  const data = cart.data!;
  const discount = coupon && check ? check : null;
  const blocked = data.can_checkout === false;
  // Changes whenever lines or quantities change, so the coupon is re-checked.
  const cartVersion = (data.items ?? []).map((i) => `${i.id}:${i.quantity}`).join(",") + `|${data.subtotal_usd}`;

  return (
    <aside aria-labelledby="summary-title" className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
      <h2 id="summary-title" className="font-display text-[1.563rem] leading-tight">
        Order summary
      </h2>
      <CouponField cartVersion={cartVersion} onChecked={setCheck} />
      <dl className="grid gap-2 border-t border-border pt-4 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal ({data.item_count} {data.item_count === 1 ? "item" : "items"})</dt>
          <dd className="tabular-nums">{formatMoney(data.subtotal_usd, data.subtotal_khr, currency)}</dd>
        </div>
        {discount ? (
          <div className="flex justify-between gap-4 text-success">
            <dt>Discount ({discount.code})</dt>
            <dd className="tabular-nums">−{formatMoney(discount.discount_usd, discount.discount_khr, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="text-muted-foreground">At checkout</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">Total before shipping</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {discount
              ? formatMoney(discount.total_before_shipping_usd, discount.total_before_shipping_khr, currency)
              : formatMoney(data.subtotal_usd, data.subtotal_khr, currency)}
          </dd>
        </div>
      </dl>
      {blocked ? (
        <p className="flex items-start gap-2 rounded-md bg-destructive-tint px-3 py-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Some items can't be ordered as they are. Change or remove the items marked in red to continue.
        </p>
      ) : null}
      <CtaGlare block>
        <Link
          to="/checkout"
          aria-disabled={blocked || undefined}
          tabIndex={blocked ? -1 : undefined}
          className={cn(buttonVariants({ variant: "cta", size: "lg" }), "w-full", blocked && "pointer-events-none opacity-40")}
        >
          Continue to checkout <ArrowRight aria-hidden="true" />
        </Link>
      </CtaGlare>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="size-4 shrink-0" aria-hidden="true" /> Pay cash on delivery. Card and Bakong KHQR are coming soon.
      </p>
    </aside>
  );
}

function CartContents() {
  const { cart } = useUsableCart();
  const mutations = useCartMutations();
  const [confirmClear, setConfirmClear] = useState(false);

  if (cart.isPending) {
    return (
      <SkeletonGroup label="Loading your cart…" className="grid gap-6">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </SkeletonGroup>
    );
  }
  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => cart.refetch()} />;

  const items = cart.data.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Books you add will wait here until you're ready to check out."
        action={
          <Link to="/books" className={buttonVariants()}>
            Browse books
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <section aria-labelledby="lines-title" className="lg:col-span-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="lines-title" className="font-display text-[1.563rem] leading-tight">
            {cart.data.item_count} {cart.data.item_count === 1 ? "item" : "items"}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} disabled={mutations.clearing} className="text-muted-foreground">
            Empty cart
          </Button>
        </div>
        <ul className="grid gap-6 rounded-xl border border-border bg-card p-5 sm:p-6 [&>li+li]:border-t [&>li+li]:border-border [&>li+li]:pt-6" aria-label="Items in your cart">
          {items.map((line) => (
            <CartLineItem key={line.id} line={line} busy={mutations.busyLineId === line.id} onQuantity={mutations.setQuantity} onRemove={mutations.remove} />
          ))}
        </ul>
      </section>
      <div className="lg:col-span-4">
        <Summary />
      </div>
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Empty your cart?"
        description="This removes every book from your cart."
        confirmLabel="Empty cart"
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

export default function CartPage() {
  useDocumentTitle("Your cart");
  const recent = useRecentlyViewed();
  return (
    <div className="container-shell pb-16">
      <PageHeader crumbs={[{ label: "Home", to: "/" }, { label: "Cart" }]} title="Your cart" />
      <CartGate headingLevel="h2">
        <CartContents />
      </CartGate>
      <BookShelf id="cart-recent" eyebrow="Your history" title="Recently viewed" books={recent.slice(0, 8)} className="mt-20" />
    </div>
  );
}
