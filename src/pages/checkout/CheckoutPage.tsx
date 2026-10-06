import { useEffect, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Lock, TicketPercent } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { cartApi, cartKeys, cartQueries } from "@/api/endpoints/cart";
import { newIdempotencyKey } from "@/api/client";
import { ApiError } from "@/api/errors";
import type { Amount, Order } from "@/api/types";
import { PageHeader } from "@/components/catalog/PageHeader";
import { CoverThumb } from "@/components/CoverThumb";
import { CtaGlare } from "@/components/CtaGlare";
import { FormAlert } from "@/components/form/FormAlert";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { setCoupon, useCoupon } from "@/features/cart/couponStore";
import { useUsableCart } from "@/features/cart/useCart";
import { AddressPicker } from "@/features/checkout/AddressPicker";
import { PaymentOptions } from "@/features/checkout/PaymentOptions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatLabel } from "@/lib/catalog";
import { formatMoney, useCurrency } from "@/stores/currency";
import { toast } from "@/stores/toast";

/*
 * /checkout (verified customers): 1) delivery address, 2) payment (cash on
 * delivery), 3) review; a sticky summary with the API's preview (subtotal,
 * discount, shipping, total) and "Place order".
 *
 * Placing an order is safe to retry: one Idempotency-Key is kept for this
 * checkout, so if the response is lost (timeout, network) and the customer tries
 * again, the API returns the order it already created instead of a second one.
 */

function Step({ n, title, children, aside }: { n: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`step-${n}`} className="flex items-center gap-3 font-display text-[1.563rem] leading-tight">
          <span className="grid size-8 place-items-center rounded-full bg-primary font-sans text-sm font-bold text-primary-foreground" aria-hidden="true">
            {n}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, amount, className, negative }: { label: ReactNode; amount: Amount | undefined; className?: string; negative?: boolean }) {
  const currency = useCurrency();
  return (
    <div className={`flex justify-between gap-4 ${className ?? ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">
        {negative ? "−" : ""}
        {formatMoney(amount?.usd, amount?.khr, currency)}
      </dd>
    </div>
  );
}

export default function CheckoutPage() {
  useDocumentTitle("Checkout");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const coupon = useCoupon();
  const { cart } = useUsableCart();
  const addresses = useQuery(accountQueries.addresses());
  const [chosenAddress, setChosenAddress] = useState<number | null>(null);
  const list = addresses.data ?? [];
  const addressId = chosenAddress ?? list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null;
  // Delivery depends on the address (Phnom Penh or the provinces), so the totals follow the chosen one.
  const preview = useQuery({
    ...cartQueries.preview(coupon, addressId),
    enabled: Boolean(cart.data?.items?.length) && !addresses.isPending,
    retry: false,
    placeholderData: keepPreviousData,
  });
  const [formError, setFormError] = useState<string | null>(null);
  // Set when the last attempt lost its response: the order may exist even though the cart
  // now looks empty, so the page stays put and the retry (same key) returns that order.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef(newIdempotencyKey());

  // A coupon that the preview rejects (expired, under its minimum) is dropped with the reason.
  const couponError = preview.isError ? ApiError.from(preview.error).field("coupon_code") : undefined;
  useEffect(() => {
    if (!couponError || !coupon) return;
    setCoupon(null);
    toast.info({ title: `${coupon} was removed`, description: couponError });
  }, [couponError, coupon]);

  const place = useMutation({
    mutationFn: () => cartApi.placeOrder({ address_id: addressId!, payment_method: "cod", ...(coupon ? { coupon_code: coupon } : {}) }, idempotencyKey.current),
    onSuccess: (order: Order) => {
      setCoupon(null);
      queryClient.removeQueries({ queryKey: cartKeys.cart() });
      queryClient.removeQueries({ queryKey: ["cart", "preview"] });
      queryClient.removeQueries({ queryKey: ["orders"] });
      navigate(`/checkout/success/${order.id}`, { replace: true, state: { order } });
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      const lost = apiError.kind === "network";
      setUnconfirmed(lost);
      // Only a lost response keeps the same key (so a retry can't order twice); anything the
      // API answered means no order was created, and the next attempt is a fresh one.
      if (!lost) idempotencyKey.current = newIdempotencyKey();
      const message =
        apiError.field("cart") ?? apiError.field("address_id") ?? apiError.field("coupon_code") ?? apiError.field("payment_method") ?? apiError.message;
      setFormError(lost ? "The connection dropped before we heard back. Try again: if your order did go through, you'll see it instead of a second one." : message);
      if (!lost) {
        // The API turned the order down (stock, price, coupon…): show the cart as it is now.
        void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
        void queryClient.invalidateQueries({ queryKey: ["cart", "preview"] });
      }
      requestAnimationFrame(() => alertRef.current?.focus());
    },
  });

  if (cart.isPending || addresses.isPending) {
    return (
      <div className="container-shell py-10">
        <SkeletonGroup label="Loading checkout…" className="grid gap-6 lg:grid-cols-12">
          <div className="grid gap-4 lg:col-span-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl lg:col-span-4" />
        </SkeletonGroup>
      </div>
    );
  }
  if (cart.isError) return <div className="container-shell py-16"><ErrorState error={cart.error} onRetry={() => cart.refetch()} headingLevel="h1" /></div>;
  // Nothing to buy (e.g. the order was just placed in another tab): back to the cart.
  if (!place.isSuccess && !unconfirmed && !cart.data.items?.length) return <Navigate to="/cart" replace />;

  const items = cart.data.items ?? [];
  const data = preview.data;
  const blocked = cart.data.can_checkout === false || data?.can_checkout === false;
  // A retry after a lost response replays the same key, so it never depends on today's cart.
  const ready = Boolean(addressId) && (unconfirmed || (Boolean(data) && !blocked));
  const shipsSomething = data?.requires_shipping !== false;

  return (
    <div className="container-shell pb-16">
      <PageHeader crumbs={[{ label: "Home", to: "/" }, { label: "Cart", to: "/cart" }, { label: "Checkout" }]} title="Checkout" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="grid content-start gap-10 lg:col-span-8">
          <Step n={1} title={shipsSomething ? "Delivery address" : "Contact address"}>
            {!shipsSomething ? <p className="-mt-2 text-sm text-muted-foreground">Everything in this order is digital; we still need an address for your receipt.</p> : null}
            {addresses.isError ? <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} headingLevel="h3" showHomeLink={false} /> : <AddressPicker addresses={list} value={addressId} onChange={setChosenAddress} />}
          </Step>

          <Step n={2} title="Payment">
            <PaymentOptions />
          </Step>

          <Step
            n={3}
            title="Review your items"
            aside={
              <Link to="/cart" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
                Edit cart
              </Link>
            }
          >
            <ul className="grid gap-4 rounded-xl border border-border bg-card p-5" aria-label="Items in this order">
              {items.map((line) => (
                <li key={line.id} className="flex items-center gap-4">
                  <CoverThumb src={line.cover_image_url} className="h-[72px] w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-semibold">{line.book?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatLabel(line.format)} · Qty {line.quantity}
                    </p>
                    {line.issues?.length ? <p className="text-sm text-destructive">{line.issues[0].message}</p> : null}
                  </div>
                  <p className="font-semibold tabular-nums">{formatMoney(line.line_total_usd, line.line_total_khr, currency)}</p>
                </li>
              ))}
            </ul>
          </Step>
        </div>

        <aside aria-labelledby="checkout-summary" className="lg:col-span-4">
          <div className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <h2 id="checkout-summary" className="font-display text-[1.563rem] leading-tight">
              Order total
            </h2>

            {formError ? <FormAlert ref={alertRef} title={unconfirmed ? "We couldn't confirm your order" : "Your order wasn't placed"}>{formError}</FormAlert> : null}

            {data?.coupon_code ? (
              <p className="flex items-center justify-between gap-2 rounded-lg bg-success-tint px-3 py-2 text-sm text-success">
                <span className="flex items-center gap-2">
                  <TicketPercent className="size-4" aria-hidden="true" />
                  <span className="font-bold uppercase tracking-wide">{data.coupon_code}</span> applied
                </span>
                <button type="button" onClick={() => setCoupon(null)} className="font-semibold underline-offset-4 hover:underline">
                  Remove
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Have a coupon?{" "}
                <Link to="/cart" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Add it in your cart
                </Link>
              </p>
            )}

            {preview.isPending || (preview.isFetching && !data) ? (
              <SkeletonGroup label="Working out your total…" className="grid gap-2">
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
                <Skeleton className="h-8" />
              </SkeletonGroup>
            ) : preview.isError && !couponError ? (
              <ErrorState error={preview.error} onRetry={() => preview.refetch()} headingLevel="h3" showHomeLink={false} />
            ) : data ? (
              <>
              <dl className="grid gap-2 text-[15px]" aria-busy={preview.isFetching || undefined}>
                <Row label={<span className="text-muted-foreground">Subtotal</span>} amount={data.subtotal} />
                {Number(data.discount?.usd) > 0 ? <Row label="Discount" amount={data.discount} negative className="text-success" /> : null}
                {shipsSomething ? <Row
                    label={
                      <span className="text-muted-foreground">
                        Delivery{data.delivery_area ? ` (${data.delivery_area === "phnom_penh" ? "Phnom Penh" : "provinces"})` : ""}
                      </span>
                    }
                    amount={data.shipping_fee}
                  /> : null}
                {Number(data.tax?.usd) > 0 ? <Row label={<span className="text-muted-foreground">Tax</span>} amount={data.tax} /> : null}
                <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{formatMoney(data.total?.usd, data.total?.khr, currency)}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted-foreground">Pay the courier in cash when your order arrives.</p>
              </>
            ) : null}

            {blocked ? (
              <p className="flex items-start gap-2 rounded-md bg-destructive-tint px-3 py-2 text-sm text-destructive" role="alert">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Some items can't be ordered as they are.{" "}
                  <Link to="/cart" className="font-semibold underline underline-offset-4">
                    Review your cart
                  </Link>
                </span>
              </p>
            ) : !addressId ? (
              <p className="text-sm text-muted-foreground">Add a delivery address to continue.</p>
            ) : null}

            <CtaGlare block>
              <Button variant="cta" size="lg" className="w-full" onClick={() => { setFormError(null); place.mutate(); }} disabled={!ready} loading={place.isPending}>
                {place.isPending ? "Placing your order…" : "Place order"}
              </Button>
            </CtaGlare>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" aria-hidden="true" /> Nothing is charged now. You pay when the books arrive.
            </p>
            <Link to="/cart" className={buttonVariants({ variant: "link", className: "justify-self-center" })}>
              Back to cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
