import { useEffect, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Check, Lock, QrCode, TicketPercent, Truck } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { cartApi, cartKeys, cartQueries } from "@/api/endpoints/cart";
import { deliveryQueries } from "@/api/endpoints/delivery";
import { newIdempotencyKey } from "@/api/client";
import { ApiError } from "@/api/errors";
import type { Amount, Order } from "@/api/types";
import { PageHeader } from "@/components/catalog/PageHeader";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { CoverThumb } from "@/components/CoverThumb";
import { CheckoutProgress } from "@/components/shopping/CheckoutProgress";
import { CoverStack } from "@/components/shopping/CoverStack";
import { CtaGlare } from "@/components/CtaGlare";
import { FormAlert } from "@/components/form/FormAlert";
import { TextAreaField } from "@/components/form/Field";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { setCoupon, useCoupon } from "@/features/cart/couponStore";
import { useUsableCart } from "@/features/cart/useCart";
import { AddressPicker } from "@/features/checkout/AddressPicker";
import { GiftOption } from "@/features/checkout/GiftOption";
import { PaymentOptions, type PaymentChoice } from "@/features/checkout/PaymentOptions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { toast } from "@/stores/toast";
import { formatName, getDict, useT } from "@/i18n";
import { FreeGiftLine } from "@/features/offers/FreeGiftLine";
import { CouponNotUsedNote } from "@/features/offers/offerText";
import { offerLineText } from "@/features/offers/offerLineText";
import { percentLabel } from "@/features/offers/percent";
import { PromoReminder } from "@/features/promotions/PromoReminder";
import { shopFeaturesQuery } from "@/api/endpoints/credit";

/*
 * /checkout (verified customers, pages/shopping.md): on the warm paper with the checkout rail beside the title.
 * Three steps on a vertical rail (numbered discs that turn into checks once settled): 1) delivery address (tiles)
 * with the delivery date, note and gift option, 2) payment (cash on delivery; Bakong KHQR when the API lists it),
 * 3) review; a sticky summary with the order's covers, the API's preview (subtotal, discount, shipping, total in
 * display type) and "Place order".
 *
 * Placing an order is safe to retry: one Idempotency-Key is kept for this
 * checkout, so if the response is lost (timeout, network) and the customer tries
 * again, the API returns the order it already created instead of a second one.
 */

function Step({ n, title, children, aside, done, last }: { n: number; title: string; children: ReactNode; aside?: ReactNode; done?: boolean; last?: boolean }) {
  const { dict } = useT();
  return (
    <section aria-labelledby={`step-${n}`} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 sm:gap-x-5">
      {/* The rail: a numbered disc (a check once the step is settled) and a hairline down to the next step. */}
      <span className="relative flex justify-center" aria-hidden="true">
        <span
          className={cn(
            "z-[1] grid size-9 place-items-center rounded-full font-sans text-sm font-bold transition-colors duration-300",
            done ? "bg-primary text-primary-foreground" : "bg-card text-primary shadow-[inset_0_0_0_2px_var(--primary)]",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        {last ? null : <span className="absolute bottom-[-2.5rem] top-10 w-px bg-[linear-gradient(to_bottom,var(--border)_50%,transparent_0)] bg-[length:1px_8px]" />}
      </span>
      <div className="grid min-w-0 gap-4">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <h2 id={`step-${n}`} className="font-display text-[1.563rem] leading-tight">
            {title}
            {done ? <span className="sr-only"> ({dict.shopping.stepDoneSr})</span> : null}
          </h2>
          {aside}
        </div>
        {children}
      </div>
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
  const { dict } = useT();
  const k = dict.checkoutPage;
  useDocumentTitle(dict.checkout.title);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const coupon = useCoupon();
  const { cart } = useUsableCart();
  const addresses = useQuery(accountQueries.addresses());
  const [chosenAddress, setChosenAddress] = useState<number | null>(null);
  const list = addresses.data ?? [];
  const [useCredit, setUseCredit] = useState(false);
  const features = useQuery(shopFeaturesQuery());
  const addressId = chosenAddress ?? list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null;
  // KHQR is offered only when the API lists it (KHQR payments design 2026-11-02).
  const options = useQuery(deliveryQueries.options());
  const khqr = options.data?.payment_methods?.find((m) => m.code === "khqr") ?? null;
  const [chosenMethod, setChosenMethod] = useState<PaymentChoice>("cod");
  const paymentMethod: PaymentChoice = chosenMethod === "khqr" && khqr ? "khqr" : "cod";
  // Delivery depends on the address (Phnom Penh or the provinces), so the totals follow the chosen one; with KHQR on
  // offer they follow the payment way too (KHQR discount, owner 2026-11-12).
  const preview = useQuery({
    ...cartQueries.preview(coupon, addressId, useCredit, khqr ? paymentMethod : null),
    enabled: Boolean(cart.data?.items?.length) && !addresses.isPending,
    retry: false,
    placeholderData: keepPreviousData,
  });
  // Cash on delivery stops at the shop's limit: then KHQR is the way to pay (chosen for the customer when offered).
  const codBlocked =
    preview.data?.cod_allowed === false && preview.data.cod_max ? dict.checkoutPage.codOverLimit(formatMoney(preview.data.cod_max.usd, preview.data.cod_max.khr, currency)) : null;
  // Adjusted while rendering (React's "state from props" pattern), so there is no extra effect pass.
  if (codBlocked && khqr && chosenMethod === "cod") setChosenMethod("khqr");
  const khqrSaving = Number(preview.data?.khqr_saving?.usd) > 0 ? formatMoney(preview.data?.khqr_saving?.usd, preview.data?.khqr_saving?.khr, currency) : null;
  const [deliveryNote, setDeliveryNote] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
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
    toast.info({ title: getDict().checkoutPage.removedCoupon(coupon), description: couponError });
  }, [couponError, coupon]);

  const place = useMutation({
    mutationFn: () =>
      cartApi.placeOrder(
        {
          address_id: addressId!,
          payment_method: paymentMethod,
          ...(useCredit ? { use_credit: true, expected_payment_due_usd: preview.data?.payment_due?.usd } : {}),
          ...(coupon ? { coupon_code: coupon } : {}),
          ...(deliveryNote.trim() ? { delivery_note: deliveryNote.trim() } : {}),
          ...(isGift ? { is_gift: true, ...(giftMessage.trim() ? { gift_message: giftMessage.trim() } : {}) } : {}),
          // Offers spec O1: send the offer the customer saw, so a just-ended offer never silently raises the total.
          ...(preview.data?.applied === "offer" && preview.data.offer?.id ? { offer_id: preview.data.offer.id } : {}),
        },
        idempotencyKey.current,
      ),
    onSuccess: (order: Order) => {
      setCoupon(null);
      queryClient.removeQueries({ queryKey: cartKeys.cart() });
      queryClient.removeQueries({ queryKey: ["cart", "preview"] });
      queryClient.removeQueries({ queryKey: ["orders"] });
      // A KHQR order waits for payment: straight to its QR page.
      if (order.payment_method === "khqr" && order.status === "pending") navigate(`/account/orders/${order.id}/pay`, { replace: true });
      // The order's lines carry no covers, so the cart's go along for the thank-you page (display only).
      else navigate(`/checkout/success/${order.id}`, { replace: true, state: { order, covers: (cart.data?.items ?? []).map((l) => ({ src: l.cover_image_url, title: l.book?.title })) } });
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      const lost = apiError.kind === "network";
      setUnconfirmed(lost);
      // Only a lost response keeps the same key (so a retry can't order twice); anything the
      // API answered means no order was created, and the next attempt is a fresh one.
      if (!lost) idempotencyKey.current = newIdempotencyKey();
      const message =
        apiError.field("cart") ?? apiError.field("address_id") ?? apiError.field("coupon_code") ?? apiError.field("offer_id") ?? apiError.field("payment_method") ?? apiError.message;
      setFormError(lost ? getDict().checkoutPage.connectionDropped : message);
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
        <SkeletonGroup label={k.loading} className="grid gap-6 lg:grid-cols-12">
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
  // The offer/coupon part of the discount; the KHQR part has its own row.
  const otherDiscount = Math.max(0, Number(data?.discount?.usd ?? 0) - Number(data?.khqr_discount?.usd ?? 0));
  const blocked = cart.data.can_checkout === false || data?.can_checkout === false;
  // A retry after a lost response replays the same key, so it never depends on today's cart.
  const ready = Boolean(addressId) && (unconfirmed || (Boolean(data) && !blocked && !preview.isFetching && !(paymentMethod === "cod" && codBlocked)));
  const shipsSomething = data?.requires_shipping !== false;

  const covers = items.map((line) => ({ src: line.cover_image_url, title: line.book?.title }));

  return (
    <div className="overflow-x-clip pb-20">
      <div className="container-shell">
        <PageHeader
          crumbs={[{ label: k.home, to: "/" }, { label: dict.nav.cart, to: "/cart" }, { label: dict.checkout.title }]}
          title={dict.checkout.title}
          aside={<CheckoutProgress current="details" withPay={paymentMethod === "khqr"} />}
          className="pb-6 sm:pt-6 short:gap-2 short:pb-4 short:pt-3 short:[&_h1]:text-[2.6rem]"
        />

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="grid content-start gap-10 lg:col-span-7 xl:col-span-8">
            <Step n={1} title={shipsSomething ? dict.checkout.deliveryAddress : k.contactAddress} done={Boolean(addressId)}>
              {!shipsSomething ? <p className="-mt-2 text-sm text-muted-foreground">{k.digitalOnly}</p> : null}
              {addresses.isError ? <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} headingLevel="h3" showHomeLink={false} /> : <AddressPicker addresses={list} value={addressId} onChange={setChosenAddress} />}
              {shipsSomething && data?.estimated_delivery ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
                    <Truck className="size-[18px]" aria-hidden="true" />
                  </span>
                  <div className="grid min-w-0 gap-0.5">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {data.province_name ? dict.shopping.deliveringTo(data.province_name) : k.delivery}
                    </p>
                    <p className="text-sm leading-snug text-muted-foreground">{k.estDelivery(data.estimated_delivery.formatted)}</p>
                  </div>
                  {data.is_free_shipping ? (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded bg-success-tint px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-success">
                      <Check className="size-3.5" aria-hidden="true" /> {dict.shopping.freeDelivery}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <TextAreaField
                label={k.deliveryNote}
                optional
                hint={
                  <span className="flex items-center justify-between gap-2">
                    <span>{k.deliveryNoteHint}</span>
                    <span className="tabular-nums">{deliveryNote.length}/300</span>
                  </span>
                }
                maxLength={300}
                rows={3}
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                containerClassName="mt-2"
              />
              <GiftOption
                isGift={isGift}
                onIsGiftChange={setIsGift}
                message={giftMessage}
                onMessageChange={setGiftMessage}
                cashOnDelivery={paymentMethod === "cod"}
                khqrAvailable={Boolean(khqr)}
              />
            </Step>

            <Step n={2} title={dict.checkout.paymentMethod} done>
              {(features.data?.gift_cards || features.data?.referrals) && Number(preview.data?.credit_balance?.usd) > 0 ? (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-lapis-tint">
                  <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} disabled={place.isPending || unconfirmed} className="size-[18px] accent-primary" />
                  {dict.credit.use} ({formatMoney(preview.data?.credit_balance?.usd, preview.data?.credit_balance?.khr, currency)})
                </label>
              ) : null}
              <PaymentOptions value={paymentMethod} onChange={setChosenMethod} khqr={khqr} khqrSaving={khqrSaving} codBlocked={codBlocked} />
            </Step>

            <Step
              n={3}
              title={k.review}
              last
              aside={
                <Link to="/cart" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
                  {k.editCart}
                </Link>
              }
            >
              <ul className="shop-card grid rounded-2xl border border-border bg-card px-5 [&>li]:py-4 [&>li+li]:border-t [&>li+li]:border-border" aria-label={k.itemsInOrder}>
                {items.map((line) => (
                  <li key={line.id} className="flex items-center gap-4">
                    <span className="relative shrink-0 overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgb(20_16_10/0.1),0_12px_20px_-12px_rgb(20_16_10/0.55)]">
                      <CoverThumb src={line.cover_image_url} className="h-[84px] w-14" />
                      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.2)_0_3%,rgb(255_255_255/0.16)_4%,transparent_10%)]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-display text-[1.15rem] leading-snug">{line.book?.title}</p>
                      <p className="text-sm text-muted-foreground">{k.line(formatName(dict, line.format), line.quantity ?? 0)}</p>
                      {line.issues?.length ? <p className="text-sm text-destructive">{line.issues[0].message}</p> : null}
                    </div>
                    <p className="font-semibold tabular-nums">{formatMoney(line.line_total_usd, line.line_total_khr, currency)}</p>
                  </li>
                ))}
              </ul>
            </Step>
          </div>

          <aside aria-labelledby="checkout-summary" className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-span-5 xl:col-span-4">
            <FreeGiftLine gift={data?.free_gift} />
            <div className="shop-card grid gap-4 rounded-2xl border border-border bg-card p-5 short:gap-3 short:py-4 sm:px-6">
              <div className="group flex items-end justify-between gap-4">
                <div>
                  <h2 id="checkout-summary" className="font-display text-[1.563rem] leading-tight">
                    {k.orderTotal}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{dict.cartPage.items(cart.data.item_count ?? 0)}</p>
                </div>
                <CoverStack items={covers} size="sm" />
              </div>

              {formError ? <FormAlert ref={alertRef} title={unconfirmed ? k.unconfirmed : k.notPlaced}>{formError}</FormAlert> : null}

              {data?.coupon_code ? (
                <p className="flex items-center justify-between gap-2 rounded-lg bg-success-tint px-3 py-2 text-sm text-success">
                  <span className="flex items-center gap-2">
                    <TicketPercent className="size-4" aria-hidden="true" />
                    <span className="font-bold uppercase tracking-wide">{data.coupon_code}</span> {k.applied}
                  </span>
                  <button type="button" onClick={() => setCoupon(null)} className="min-h-11 font-semibold underline-offset-4 hover:underline">
                    {k.remove}
                  </button>
                </p>
              ) : data?.coupon_not_used?.code ? (
                <CouponNotUsedNote code={data.coupon_not_used.code} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {k.haveCoupon}{" "}
                  <Link to="/cart" className="font-semibold text-primary underline-offset-4 hover:underline">
                    {k.addInCart}
                  </Link>
                </p>
              )}

              <PromoReminder />

              {data && shipsSomething ? (
                <FreeShippingBar subtotalUsd={Number(data.subtotal?.usd || 0) - Number(data.discount?.usd || 0)} thresholdUsd={data.free_shipping_threshold?.usd} free={data.is_free_shipping} />
              ) : null}

              {data?.shipping_notice ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-lapis-tint p-3">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <p className="text-sm text-foreground">{data.shipping_notice}</p>
                </div>
              ) : null}

              {preview.isPending || (preview.isFetching && !data) ? (
                <SkeletonGroup label={k.workingOut} className="grid gap-2">
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                  <Skeleton className="h-8" />
                </SkeletonGroup>
              ) : preview.isError && !couponError ? (
                <ErrorState error={preview.error} onRetry={() => preview.refetch()} headingLevel="h3" showHomeLink={false} />
              ) : data ? (
                <dl className="grid gap-1.5 border-t border-border pt-3 text-[15px]" aria-busy={preview.isFetching || undefined}>
                  <Row label={<span className="text-muted-foreground">{k.subtotal}</span>} amount={data.subtotal} />
                  {otherDiscount > 0 ? (
                    <Row
                      label={data.applied === "offer" && data.offer ? offerLineText(dict, data.offer) : k.discount}
                      amount={{ usd: otherDiscount.toFixed(2), khr: null }}
                      negative
                      className="text-success"
                    />
                  ) : null}
                  {Number(data.khqr_discount?.usd) > 0 ? (
                    <Row label={k.khqrDiscount(percentLabel(data.khqr_discount_percent ?? "0"))} amount={data.khqr_discount} negative className="text-success" />
                  ) : null}
                  {shipsSomething ? (
                    <Row
                      label={
                        <span className="text-muted-foreground">
                          {k.delivery}{data.delivery_area ? ` (${data.delivery_area === "phnom_penh" ? k.phnomPenh : k.provinces})` : ""}
                          {data.is_free_shipping ? (
                            <span className="ml-2 inline-flex items-center rounded bg-success-tint px-1.5 py-0.5 text-xs font-semibold uppercase text-success">{k.freeBadge}</span>
                          ) : null}
                        </span>
                      }
                      amount={data.shipping_fee}
                    />
                  ) : null}
                  {Number(data.tax?.usd) > 0 ? <Row label={<span className="text-muted-foreground">{k.tax}</span>} amount={data.tax} /> : null}
                  {Number(data.referral_discount?.usd) > 0 ? <div className="flex justify-between gap-3 text-sm text-success"><dt>{dict.credit.referralDiscount}</dt><dd>{formatMoney(data.referral_discount?.usd, data.referral_discount?.khr, currency)}</dd></div> : null}
                  {Number(data.credit_used?.usd) > 0 ? <><Row label={dict.credit.used} amount={data.credit_used} negative /><Row label={dict.credit.due} amount={data.payment_due} /></> : null}
                  <div className="mt-1.5 flex items-baseline justify-between gap-4 border-t border-border pt-3">
                    <dt className="font-semibold">{k.total}</dt>
                    <dd className="font-display text-[2rem] leading-none tabular-nums">{formatMoney(data.total?.usd, data.total?.khr, currency)}</dd>
                  </div>
                </dl>
              ) : null}
              {data?.estimated_delivery?.formatted && shipsSomething ? (
                <p className="-mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Truck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{k.estDelivery(data.estimated_delivery.formatted)}</span>
                </p>
              ) : null}

              {blocked ? (
                <p className="flex items-start gap-2 rounded-md bg-destructive-tint px-3 py-2 text-sm text-destructive" role="alert">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {k.cantOrder}{" "}
                    <Link to="/cart" className="font-semibold underline underline-offset-4">
                      {k.reviewCart}
                    </Link>
                  </span>
                </p>
              ) : !addressId ? (
                <p className="text-sm text-muted-foreground">{k.addAddress}</p>
              ) : null}

              <CtaGlare block>
                <Button variant="cta" size="lg" className="w-full" onClick={() => { setFormError(null); place.mutate(); }} disabled={!ready} loading={place.isPending}>
                  {place.isPending ? dict.checkout.placingOrder : paymentMethod === "khqr" ? k.placeAndPay : dict.checkout.placeOrder}
                </Button>
              </CtaGlare>
              {/* What happens to the money, for the chosen way to pay. */}
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                {paymentMethod === "khqr" ? <QrCode className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                {paymentMethod === "khqr" ? k.khqrReady(khqr?.pay_minutes ?? 15) : k.nothingCharged}
              </p>
              <Link to="/cart" className={buttonVariants({ variant: "link", className: "justify-self-center" })}>
                {k.backToCart}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
