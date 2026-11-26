import "./checkout-page.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, Check, ChevronDown, Clock, Lock, MapPin, MapPinned, MessageSquareText, PackageCheck, Pencil, Phone, QrCode, ShieldCheck, Truck, Wallet } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { cartApi, cartKeys, cartQueries } from "@/api/endpoints/cart";
import { deliveryQueries } from "@/api/endpoints/delivery";
import { newIdempotencyKey } from "@/api/client";
import { ApiError } from "@/api/errors";
import type { Amount, CartLine, Order } from "@/api/types";
import { PageHeader } from "@/components/catalog/PageHeader";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { CoverThumb } from "@/components/CoverThumb";
import { CheckoutProgress, type CheckoutStep } from "@/components/shopping/CheckoutProgress";
import { CoverStack } from "@/components/shopping/CoverStack";
import { CtaGlare } from "@/components/CtaGlare";
import { FormAlert } from "@/components/form/FormAlert";
import { TextAreaField, TextField } from "@/components/form/Field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { setCoupon, useCoupon } from "@/features/cart/couponStore";
import { useUsableCart } from "@/features/cart/useCart";
import { AddressBrandMark, AddressPicker } from "@/features/checkout/AddressPicker";
import { PaymentBrandMark, PaymentOptions, type PaymentChoice } from "@/features/checkout/PaymentOptions";
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
 * /checkout (verified customers): 3 focused steps on the warm paper:
 *   1) Delivery — address, courier phone, delivery note, estimated arrival
 *   2) Payment  — cash on delivery / Bakong KHQR (+ store credit when available)
 *   3) Review   — full order receipt preview before clicking "Confirm & place order" -> /checkout/success/:id
 * Right sticky summary keeps "Review your items" + "Edit cart" compact so the orange CTA sits above the fold.
 */

type WizardStep = "delivery" | "payment" | "review";

function StepCard({ n, title, subtitle, children, aside, done }: { n: number; title: string; subtitle?: string; children: ReactNode; aside?: ReactNode; done?: boolean }) {
  const { dict } = useT();
  return (
    <section aria-labelledby={`step-${n}`} className="checkout-section">
      <span className="relative flex justify-center" aria-hidden="true">
        <span
          className={cn(
            "z-[1] grid size-8 place-items-center rounded-lg font-sans text-xs font-bold transition-colors duration-300",
            done ? "bg-primary text-primary-foreground" : "bg-card text-primary shadow-[inset_0_0_0_2px_var(--primary)]",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
      </span>
      <div className="grid min-w-0 gap-4">
        <div className="flex min-h-8 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={`step-${n}`} className="font-display text-[1.45rem] leading-tight">
              {title}
              {done ? <span className="sr-only"> ({dict.shopping.stepDoneSr})</span> : null}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Compact item list shown in the right sticky summary and in the full Review receipt. */
function ReviewItems({ items, compact = false, className }: { items: CartLine[]; compact?: boolean; className?: string }) {
  const { dict } = useT();
  const k = dict.checkoutPage;
  const currency = useCurrency();
  return (
    <ul className={cn("checkout-review-items grid", compact ? "gap-2" : "gap-3", className)} aria-label={k.itemsInOrder}>
      {(items ?? []).map((line) => (
        <li key={line.id} className={cn("flex items-center", compact ? "gap-2.5" : "gap-3")}>
          <span className="relative shrink-0 overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgb(20_16_10/0.1),0_6px_10px_-8px_rgb(20_16_10/0.5)]">
            <CoverThumb src={line.cover_image_url} className={compact ? "h-[46px] w-[31px]" : "h-[54px] w-9"} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("line-clamp-1 font-semibold leading-snug", compact ? "text-[13px]" : "text-sm")}>{line.book?.title}</p>
            <p className="text-xs text-muted-foreground">{k.line(formatName(dict, line.format), line.quantity ?? 0)}</p>
            {line.issues?.length ? <p className="text-xs text-destructive">{line.issues[0].message}</p> : null}
          </div>
          <p className={cn("font-semibold tabular-nums", compact ? "text-[13px]" : "text-sm")}>{formatMoney(line.line_total_usd, line.line_total_khr, currency)}</p>
        </li>
      ))}
    </ul>
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
  const [step, setStep] = useState<WizardStep>("delivery");
  const [chosenAddress, setChosenAddress] = useState<number | null>(null);
  const list = addresses.data ?? [];
  const [useCredit, setUseCredit] = useState(false);
  const features = useQuery(shopFeaturesQuery());
  const addressId = chosenAddress ?? list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null;
  const options = useQuery(deliveryQueries.options());
  const khqr = options.data?.payment_methods?.find((m) => m.code === "khqr") ?? null;
  const [chosenMethod, setChosenMethod] = useState<PaymentChoice>("cod");
  const paymentMethod: PaymentChoice = chosenMethod === "khqr" && khqr ? "khqr" : "cod";
  const preview = useQuery({
    ...cartQueries.preview(coupon, addressId, useCredit, khqr ? paymentMethod : null),
    enabled: Boolean(cart.data?.items?.length) && !addresses.isPending,
    retry: false,
    placeholderData: keepPreviousData,
  });
  const codBlocked =
    preview.data?.cod_allowed === false && preview.data.cod_max ? dict.checkoutPage.codOverLimit(formatMoney(preview.data.cod_max.usd, preview.data.cod_max.khr, currency)) : null;
  if (codBlocked && khqr && chosenMethod === "cod") setChosenMethod("khqr");
  const khqrSaving = Number(preview.data?.khqr_saving?.usd) > 0 ? formatMoney(preview.data?.khqr_saving?.usd, preview.data?.khqr_saving?.khr, currency) : null;
  const [phoneEdits, setPhoneEdits] = useState<Record<number, string>>({});
  const selectedAddress = list.find((a) => a.id === addressId);
  const deliveryPhone = addressId == null ? "" : phoneEdits[addressId] ?? selectedAddress?.phone ?? "";
  const phoneValid = /^\+?[0-9][0-9 ()-]{5,28}[0-9]$/.test(deliveryPhone.trim());
  const [deliveryNote, setDeliveryNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef(newIdempotencyKey());

  const couponError = preview.isError ? ApiError.from(preview.error).field("coupon_code") : undefined;
  useEffect(() => {
    if (!couponError || !coupon) return;
    setCoupon(null);
    toast.info({ title: getDict().checkoutPage.removedCoupon(coupon), description: couponError });
  }, [couponError, coupon]);

  const goToStep = (next: WizardStep) => {
    setFormError(null);
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const place = useMutation({
    mutationFn: () =>
      cartApi.placeOrder(
        {
          address_id: addressId!,
          payment_method: paymentMethod,
          ...(deliveryPhone.trim() ? { delivery_phone: deliveryPhone.trim() } : {}),
          ...(useCredit ? { use_credit: true, expected_payment_due_usd: preview.data?.payment_due?.usd } : {}),
          ...(coupon ? { coupon_code: coupon } : {}),
          ...(deliveryNote.trim() ? { delivery_note: deliveryNote.trim() } : {}),
          ...(preview.data?.applied === "offer" && preview.data.offer?.id ? { offer_id: preview.data.offer.id } : {}),
        },
        idempotencyKey.current,
      ),
    onSuccess: (order: Order) => {
      setConfirmOpen(false);
      setCoupon(null);
      queryClient.removeQueries({ queryKey: cartKeys.cart() });
      queryClient.removeQueries({ queryKey: ["cart", "preview"] });
      queryClient.removeQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["account", "coupons"] });
      void queryClient.invalidateQueries({ queryKey: ["account", "store-credits"] });
      void queryClient.invalidateQueries({ queryKey: ["account", "referrals"] });
      void queryClient.invalidateQueries({ queryKey: ["ebooks", "library"] });
      if (order.payment_method === "khqr" && order.status === "pending") navigate(`/account/orders/${order.id}/pay`, { replace: true });
      else navigate(`/checkout/success/${order.id}`, { replace: true, state: { order, covers: (cart.data?.items ?? []).map((l) => ({ src: l.cover_image_url, title: l.book?.title })) } });
    },
    onError: (error) => {
      setConfirmOpen(false);
      const apiError = ApiError.from(error);
      const lost = apiError.kind === "network";
      setUnconfirmed(lost);
      if (!lost) idempotencyKey.current = newIdempotencyKey();
      const message =
        apiError.field("cart") ?? apiError.field("address_id") ?? apiError.field("coupon_code") ?? apiError.field("offer_id") ?? apiError.field("payment_method") ?? apiError.message;
      setFormError(lost ? getDict().checkoutPage.connectionDropped : message);
      if (!lost) {
        void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
        void queryClient.invalidateQueries({ queryKey: ["cart", "preview"] });
      }
      requestAnimationFrame(() => alertRef.current?.focus());
    },
  });

  if (cart.isPending || addresses.isPending) {
    return (
      <div className="checkout-page overflow-x-clip pb-20">
        <div className="container-shell py-6 sm:py-8">
          <SkeletonGroup label={k.loading} className="grid gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
              <div className="grid gap-2">
                <Skeleton className="h-3.5 w-32 rounded-full" />
                <Skeleton className="h-9 w-44 rounded-lg" />
              </div>
              <div className="flex items-center gap-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="size-7 rounded-full" />
                ))}
              </div>
            </div>
            <div className="grid items-start gap-6 lg:grid-cols-12">
              <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-8">
                <div className="flex items-center gap-3 border-b border-border/70 pb-4">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="h-6 w-44 rounded-md" />
                </div>
                <div className="flex items-center gap-3.5 rounded-2xl border border-border p-4">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="size-11 rounded-xl" />
                  <div className="grid flex-1 gap-1.5">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="h-3.5 w-2/3 rounded-full" />
                  </div>
                </div>
                <div className="grid gap-4 border-t border-dashed border-border/70 pt-4 sm:grid-cols-2">
                  <Skeleton className="h-11 rounded-xl" />
                  <Skeleton className="h-11 rounded-xl" />
                </div>
                <Skeleton className="h-16 rounded-2xl" />
              </div>
              <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 lg:col-span-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3.5">
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <Skeleton className="h-12 w-10 rounded-md" />
                </div>
                <Skeleton className="h-10 rounded-xl" />
                <div className="grid gap-2.5 border-t border-dashed border-border/70 pt-3">
                  <div className="flex justify-between"><Skeleton className="h-3.5 w-20 rounded-full" /><Skeleton className="h-3.5 w-14 rounded-full" /></div>
                  <div className="flex justify-between"><Skeleton className="h-3.5 w-24 rounded-full" /><Skeleton className="h-3.5 w-12 rounded-full" /></div>
                </div>
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            </div>
          </SkeletonGroup>
        </div>
      </div>
    );
  }
  if (cart.isError) return <div className="container-shell py-16"><ErrorState error={cart.error} onRetry={() => cart.refetch()} headingLevel="h1" /></div>;
  if (!place.isSuccess && !unconfirmed && !cart.data.items?.length) return <Navigate to="/cart" replace />;

  const items = cart.data.items ?? [];
  const data = preview.data;
  const otherDiscount = Math.max(0, Number(data?.discount?.usd ?? 0) - Number(data?.khqr_discount?.usd ?? 0));
  const otherDiscountKhr =
    data?.discount?.khr != null
      ? String(Math.max(0, Math.round(Number(data.discount.khr) - Number(data.khqr_discount?.khr ?? 0))))
      : null;
  const totalSavingsUsd = Number(data?.discount?.usd ?? 0) + Number(data?.referral_discount?.usd ?? 0);
  const totalSavingsKhr =
    data?.discount?.khr != null || data?.referral_discount?.khr != null
      ? String(Math.round(Number(data?.discount?.khr ?? 0) + Number(data?.referral_discount?.khr ?? 0)))
      : null;
  const hasAnyDiscount = otherDiscount > 0 || Number(data?.khqr_discount?.usd ?? 0) > 0 || Number(data?.referral_discount?.usd ?? 0) > 0;
  const blocked = cart.data.can_checkout === false || data?.can_checkout === false;
  const shipsSomething = data?.requires_shipping !== false;
  const deliveryReady = Boolean(addressId) && (!shipsSomething || phoneValid) && !blocked;
  const paymentReady = deliveryReady && !(paymentMethod === "cod" && codBlocked);
  const ready = (preview.data?.requires_shipping === false || phoneValid) && Boolean(addressId) && (unconfirmed || (Boolean(data) && !blocked && !preview.isFetching && !(paymentMethod === "cod" && codBlocked)));

  const handlePrimaryAction = () => {
    if (step === "delivery") {
      if (deliveryReady) goToStep("payment");
      return;
    }
    if (step === "payment") {
      if (paymentReady) goToStep("review");
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  };

  const primaryLabel =
    step === "delivery"
      ? k.continueToPayment
      : step === "payment"
        ? k.reviewOrder
        : place.isPending
          ? dict.checkout.placingOrder
          : paymentMethod === "khqr"
            ? k.placeAndPay
            : k.confirmOrder;

  const primaryDisabled = step === "delivery" ? !deliveryReady : step === "payment" ? !paymentReady : !ready;

  const handleRailClick = (target: CheckoutStep) => {
    if (target === "delivery" || target === "payment") goToStep(target);
  };

  const formattedAddress = selectedAddress
    ? [selectedAddress.address_line1, selectedAddress.address_line2, selectedAddress.city, selectedAddress.state, selectedAddress.country].filter(Boolean).join(", ")
    : "";

  return (
    <div className="checkout-page overflow-x-clip pb-28 lg:pb-20">
      <div className="container-shell">
        <PageHeader
          crumbs={[{ label: k.home, to: "/" }, { label: dict.nav.cart, to: "/cart" }, { label: dict.checkout.title }]}
          title={dict.checkout.title}
          aside={<CheckoutProgress current={step} withPay={paymentMethod === "khqr"} onStepClick={handleRailClick} className="checkout-progress" />}
          className="pb-5 sm:pt-5 short:gap-2 short:pb-3 short:pt-2 short:[&_h1]:text-[2.4rem]"
        />

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-12 lg:gap-8">
          <div className="checkout-sections grid content-start gap-5 lg:col-span-7 xl:col-span-8">
            {/* Mobile items disclosure (< lg) on steps 1 & 2 */}
            {step !== "review" ? (
              <details className="checkout-items-mobile group rounded-2xl border border-border bg-card lg:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-semibold">{k.review} · {dict.cartPage.items(cart.data.item_count ?? 0)}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <span className="group-open:hidden">{k.show}</span>
                    <span className="hidden group-open:inline">{k.hide}</span>
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </span>
                </summary>
                <div className="grid gap-3 border-t border-border px-4 py-3">
                  <ReviewItems items={items} />
                  <Link to="/cart" className="justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline">{k.editCart}</Link>
                </div>
              </details>
            ) : null}

            {/* STEP 1: DELIVERY ADDRESS & LOCATION */}
            {step === "delivery" ? (
              <StepCard n={1} title={shipsSomething ? dict.checkout.deliveryAddress : k.contactAddress} done={deliveryReady}>
                {!shipsSomething ? <p className="-mt-2 text-sm text-muted-foreground">{k.digitalOnly}</p> : null}
                {addresses.isError ? (
                  <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} headingLevel="h3" showHomeLink={false} />
                ) : (
                  <AddressPicker addresses={list} value={addressId} onChange={setChosenAddress} />
                )}
                <div className="checkout-contact-grid border-t border-dashed border-border pt-4">
                  {shipsSomething ? (
                    <TextField
                      label={k.deliveryPhone}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      maxLength={30}
                      value={deliveryPhone}
                      onChange={(e) => addressId != null && setPhoneEdits((previous) => ({ ...previous, [addressId]: e.target.value }))}
                      hint={k.deliveryPhoneHint}
                      error={addressId != null && phoneEdits[addressId] !== undefined && !phoneValid ? k.deliveryPhoneInvalid : undefined}
                      containerClassName="checkout-delivery-phone"
                    />
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
                    containerClassName="checkout-delivery-note"
                  />
                </div>
                {shipsSomething && data?.estimated_delivery ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/25 bg-gradient-to-r from-success-tint/75 via-success-tint/35 to-lapis-tint/30 px-4 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success text-white shadow-[0_8px_18px_-10px_rgb(22_122_74/0.8)]">
                        <Truck className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          {data.province_name ? dict.shopping.deliveringTo(data.province_name) : k.delivery}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <CalendarClock className="size-3.5 shrink-0 text-success" aria-hidden="true" />
                          <span>{k.estDelivery(data.estimated_delivery.formatted)}</span>
                        </p>
                      </div>
                    </div>
                    {data.is_free_shipping ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                        {k.freeBadge}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </StepCard>
            ) : null}

            {/* STEP 2: PAYMENT METHOD */}
            {step === "payment" ? (
              <>
                {selectedAddress ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-[0_4px_16px_-14px_rgb(20_32_122/0.2)]">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-lapis-tint text-primary">
                        <MapPin className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k.deliverTo}</p>
                        <p className="truncate font-semibold text-foreground">
                          {selectedAddress.recipient_name} · {formattedAddress}
                        </p>
                        {shipsSomething && deliveryPhone ? <p className="text-xs text-muted-foreground">{deliveryPhone}</p> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => goToStep("delivery")}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-lapis-tint/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      {k.edit}
                    </button>
                  </div>
                ) : null}

                <StepCard n={2} title={dict.checkout.paymentMethod} done={paymentReady}>
                  {features.data?.referrals && Number(preview.data?.credit_balance?.usd) > 0 ? (
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-lapis-tint">
                      <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} disabled={place.isPending || unconfirmed} className="size-[18px] accent-primary" />
                      {dict.credit.use} ({formatMoney(preview.data?.credit_balance?.usd, preview.data?.credit_balance?.khr, currency)})
                    </label>
                  ) : null}
                  <PaymentOptions value={paymentMethod} onChange={setChosenMethod} khqr={khqr} khqrSaving={khqrSaving} codBlocked={codBlocked} />
                </StepCard>
              </>
            ) : null}

            {/* Desktop Review your items + Edit cart card: sits cleanly below Delivery (Step 1) and Payment (Step 2) so the right Order total card never overflows when there are 3+ books */}
            {step !== "review" ? (
              <section
                aria-labelledby="checkout-review-items-heading"
                className="checkout-items-card hidden gap-4 rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_-22px_rgb(20_32_122/0.25)] lg:grid"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <h2 id="checkout-review-items-heading" className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {k.review}
                    </h2>
                    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {dict.cartPage.items(cart.data.item_count ?? 0)}
                    </span>
                  </div>
                  <Link
                    to="/cart"
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-lapis-tint/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    {k.editCart}
                  </Link>
                </div>
                <ReviewItems items={items} />
              </section>
            ) : null}

            {/* STEP 3: ORDER REVIEW & FULL RECEIPT BEFORE CONFIRMING */}
            {step === "review" ? (
              <StepCard n={3} title={k.reviewHeading} subtitle={k.reviewLead}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Delivery receipt block */}
                  <div className="review-receipt-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2.5">
                        <span className="review-icon-badge" aria-hidden="true">
                          <MapPinned className="size-[18px]" />
                        </span>
                        <span className="text-[11.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                          {shipsSomething ? dict.checkout.deliveryAddress : k.contactAddress}
                        </span>
                      </span>
                      <button type="button" onClick={() => goToStep("delivery")} className="review-edit-pill">
                        <Pencil className="size-3" aria-hidden="true" /> {k.edit}
                      </button>
                    </div>

                    {selectedAddress ? (
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-start gap-3.5">
                          <AddressBrandMark className="review-payment-brand" />
                          <div className="grid min-w-0 flex-1 gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-semibold text-foreground">{selectedAddress.recipient_name}</p>
                              {selectedAddress.label ? (
                                <span className="rounded-full bg-lapis-tint px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  {selectedAddress.label}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">{formattedAddress}</p>
                            {shipsSomething && deliveryPhone ? (
                              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/85 tabular-nums">
                                <Phone className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                                {deliveryPhone}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {deliveryNote.trim() ? (
                          <p className="flex items-start gap-1.5 rounded-lg border border-border/80 bg-surface-1/70 px-2.5 py-1.5 text-xs text-muted-foreground">
                            <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <span>“{deliveryNote.trim()}”</span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {shipsSomething && data?.estimated_delivery ? (
                      <div className="review-status-strip review-status-lapis mt-auto">
                        <span className="review-status-icon" aria-hidden="true">
                          <Truck className="size-3.5" />
                        </span>
                        <span className="min-w-0 leading-snug">{k.estDelivery(data.estimated_delivery.formatted)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Payment receipt block */}
                  <div className="review-receipt-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2.5">
                        <span
                          className={cn("review-icon-badge", paymentMethod === "cod" && "review-icon-badge-emerald")}
                          aria-hidden="true"
                        >
                          {paymentMethod === "khqr" ? <QrCode className="size-[18px]" /> : <Wallet className="size-[18px]" />}
                        </span>
                        <span className="text-[11.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                          {dict.checkout.paymentMethod}
                        </span>
                      </span>
                      <button type="button" onClick={() => goToStep("payment")} className="review-edit-pill">
                        <Pencil className="size-3" aria-hidden="true" /> {k.edit}
                      </button>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <PaymentBrandMark method={paymentMethod} className="review-payment-brand" />
                      <div className="grid min-w-0 gap-0.5">
                        <p className="text-[15px] font-semibold text-foreground">
                          {paymentMethod === "khqr" ? k.khqr : k.cod}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {paymentMethod === "khqr" ? k.khqrReady(khqr?.pay_minutes ?? 15) : k.codDetail}
                        </p>
                      </div>
                    </div>

                    {useCredit && Number(data?.credit_used?.usd) > 0 ? (
                      <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-semibold text-success">
                        {dict.credit.used}: −{formatMoney(data?.credit_used?.usd, data?.credit_used?.khr, currency)}
                      </p>
                    ) : null}

                    <div
                      className={cn(
                        "review-status-strip mt-auto",
                        paymentMethod === "khqr" ? "review-status-lapis" : "review-status-emerald",
                      )}
                    >
                      <span className="review-status-icon" aria-hidden="true">
                        {paymentMethod === "khqr" ? <Clock className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                      </span>
                      <span className="min-w-0 leading-snug">
                        {paymentMethod === "khqr" ? k.khqrReady(khqr?.pay_minutes ?? 15) : k.nothingCharged}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Full items receipt */}
                <div className="grid gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_12px_-10px_rgb(14_19_53/0.14)] sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <span className="flex items-center gap-2.5">
                      <span className="review-icon-badge" aria-hidden="true">
                        <PackageCheck className="size-[18px]" />
                      </span>
                      <span className="text-[15px] font-semibold text-foreground">{k.itemsInOrder}</span>
                      <span className="rounded-full bg-lapis-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {dict.cartPage.items(cart.data.item_count ?? 0)}
                      </span>
                    </span>
                    <Link to="/cart" className="review-edit-pill">
                      <Pencil className="size-3" aria-hidden="true" /> {k.editCart}
                    </Link>
                  </div>
                  <ReviewItems items={items} />
                </div>
              </StepCard>
            ) : null}
          </div>

          {/* RIGHT STICKY SUMMARY: balanced fixed-height Order total card so the orange CTA always fits on the first screen */}
          <aside aria-labelledby="checkout-summary" className="checkout-summary-aside lg:sticky lg:col-span-5 xl:col-span-4">
            <FreeGiftLine gift={data?.free_gift} />
            <div className="checkout-summary-card shop-card grid gap-3.5 rounded-2xl border border-border bg-card p-5 sm:px-6">
              <div className="checkout-summary-heading group flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 id="checkout-summary" className="font-display text-[1.5rem] leading-tight">
                    {step === "review" ? k.receiptSummary : k.orderTotal}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{dict.cartPage.items(cart.data.item_count ?? 0)}</p>
                </div>
                <CoverStack items={items.map((l) => ({ src: l.cover_image_url, title: l.book?.title }))} size="sm" />
              </div>

              {formError ? <FormAlert ref={alertRef} title={unconfirmed ? k.unconfirmed : k.notPlaced}>{formError}</FormAlert> : null}

              {data?.coupon_not_used?.code ? <CouponNotUsedNote code={data.coupon_not_used.code} /> : null}

              {data && shipsSomething ? (
                <FreeShippingBar subtotalUsd={Number(data.subtotal?.usd || 0) - Number(data.discount?.usd || 0)} thresholdUsd={data.free_shipping_threshold?.usd} free={data.is_free_shipping} className="checkout-shipping-progress" />
              ) : null}

              {data?.shipping_notice ? (
                <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-lapis-tint p-2.5">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <p className="text-xs text-foreground">{data.shipping_notice}</p>
                </div>
              ) : null}

              {/* Compact coverless receipt lines (title + qty + price) so every book price is crystal clear without taking extra height */}
              {items.length > 0 ? (
                <ul
                  aria-label={k.itemsInOrder}
                  className="no-scrollbar grid max-h-[5.75rem] gap-1.5 overflow-y-auto overscroll-contain border-t border-border pt-2.5 text-xs"
                >
                  {items.map((line) => (
                    <li key={line.id} className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="truncate font-medium text-foreground">{line.book?.title}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">×{line.quantity ?? 1}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">
                        {formatMoney(line.line_total_usd, line.line_total_khr, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {preview.isPending || (preview.isFetching && !data) ? (
                <SkeletonGroup label={k.workingOut} className="grid gap-2">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-8" />
                </SkeletonGroup>
              ) : preview.isError && !couponError ? (
                <ErrorState error={preview.error} onRetry={() => preview.refetch()} headingLevel="h3" showHomeLink={false} />
              ) : data ? (
                <dl className="grid gap-1.5 border-t border-dashed border-border pt-2.5 text-sm" aria-busy={preview.isFetching || undefined}>
                  <Row label={<span className="text-muted-foreground">{k.subtotal}</span>} amount={data.subtotal} />
                  {otherDiscount > 0 ? (
                    <Row
                      label={
                        data.applied === "offer" && data.offer
                          ? offerLineText(dict, data.offer)
                          : data.coupon_code
                            ? `${k.discount} (${data.coupon_code})`
                            : k.discount
                      }
                      amount={{ usd: otherDiscount.toFixed(2), khr: otherDiscountKhr }}
                      negative
                      className="font-medium text-success"
                    />
                  ) : null}
                  {Number(data.khqr_discount?.usd) > 0 ? (
                    <Row
                      label={k.khqrDiscount(percentLabel(data.khqr_discount_percent ?? "0"))}
                      amount={data.khqr_discount}
                      negative
                      className="font-medium text-success"
                    />
                  ) : null}
                  {Number(data.referral_discount?.usd) > 0 ? (
                    <Row label={dict.credit.referralDiscount} amount={data.referral_discount} negative className="font-medium text-success" />
                  ) : null}
                  {!hasAnyDiscount ? (
                    <Row label={<span className="text-muted-foreground">{k.discount}</span>} amount={{ usd: "0.00", khr: "0" }} className="text-muted-foreground" />
                  ) : null}
                  {shipsSomething ? (
                    <Row
                      label={
                        <span className="text-muted-foreground">
                          {k.delivery}{data.delivery_area ? ` (${data.delivery_area === "phnom_penh" ? k.phnomPenh : k.provinces})` : ""}
                          {data.is_free_shipping ? (
                            <span className="ml-1.5 inline-flex items-center rounded bg-success-tint px-1.5 py-0.5 text-[11px] font-semibold uppercase text-success">{k.freeBadge}</span>
                          ) : null}
                        </span>
                      }
                      amount={data.shipping_fee}
                    />
                  ) : null}
                  {Number(data.tax?.usd) > 0 ? <Row label={<span className="text-muted-foreground">{k.tax}</span>} amount={data.tax} /> : null}
                  {Number(data.credit_used?.usd) > 0 ? (
                    <>
                      <Row label={dict.credit.used} amount={data.credit_used} negative className="font-medium text-success" />
                      <Row label={dict.credit.due} amount={data.payment_due} className="font-semibold" />
                    </>
                  ) : null}
                  <div className="checkout-grand-total mt-1 flex items-center justify-between gap-4 border-t border-border pt-2.5">
                    <dt className="grid gap-1">
                      <span className="font-semibold">{k.total}</span>
                      {totalSavingsUsd > 0 ? (
                        <span className="w-fit rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-semibold text-success">
                          {dict.cartPage.savedShort(formatMoney(totalSavingsUsd.toFixed(2), totalSavingsKhr, currency))}
                        </span>
                      ) : null}
                    </dt>
                    <dd className="font-display text-[1.75rem] leading-none tabular-nums">{formatMoney(data.total?.usd, data.total?.khr, currency)}</dd>
                  </div>
                </dl>
              ) : null}

              {blocked ? (
                <p className="flex items-start gap-2 rounded-md bg-destructive-tint px-3 py-2 text-xs text-destructive" role="alert">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {k.cantOrder}{" "}
                    <Link to="/cart" className="font-semibold underline underline-offset-4">
                      {k.reviewCart}
                    </Link>
                  </span>
                </p>
              ) : !addressId ? (
                <p className="text-xs text-muted-foreground">{k.addAddress}</p>
              ) : null}

              <div className="checkout-summary-actions">
                <CtaGlare block>
                  <Button
                    variant="default"
                    size="lg"
                    className="group h-12 w-full justify-between rounded-xl px-4 text-sm font-semibold"
                    onClick={handlePrimaryAction}
                    disabled={primaryDisabled}
                    loading={step === "review" && place.isPending}
                  >
                    {primaryLabel}
                    <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                  </Button>
                </CtaGlare>

                {step === "delivery" ? (
                  <Link to="/cart" className={buttonVariants({ variant: "outline", className: "h-10 w-full gap-2 rounded-xl text-xs font-semibold" })}>
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> {k.backToCart}
                  </Link>
                ) : step === "payment" ? (
                  <Button type="button" variant="outline" className="h-10 w-full gap-2 rounded-xl text-xs font-semibold" onClick={() => goToStep("delivery")}>
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> {k.backToDelivery}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="h-10 w-full gap-2 rounded-xl text-xs font-semibold" onClick={() => goToStep("payment")} disabled={place.isPending}>
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> {k.backToPayment}
                  </Button>
                )}

                <p className="checkout-payment-note">
                  {paymentMethod === "khqr" ? <QrCode className="size-3.5 shrink-0" aria-hidden="true" /> : <Lock className="size-3.5 shrink-0" aria-hidden="true" />}
                  {paymentMethod === "khqr" ? k.khqrReady(khqr?.pay_minutes ?? 15) : k.nothingCharged}
                </p>
              </div>

              <PromoReminder />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky grand total & step action bar (< lg) */}
      {data ? (
        <div className="fixed inset-x-0 bottom-0 z-(--z-header) border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                {k.total}
                {Number(data.khqr_discount?.usd) > 0 ? ` · −${percentLabel(data.khqr_discount_percent ?? "0")}% KHQR` : ""}
              </p>
              <p className="font-display text-[1.45rem] leading-tight tabular-nums text-foreground">
                {formatMoney(data.total?.usd, data.total?.khr, currency)}
              </p>
            </div>
            <Button
              variant="default"
              className="shrink-0 gap-1.5 rounded-xl px-3.5 text-sm sm:px-4"
              onClick={handlePrimaryAction}
              disabled={primaryDisabled}
              loading={step === "review" && place.isPending}
            >
              {primaryLabel}
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Final confirmation popup before placing the order */}
      <Dialog open={confirmOpen} onOpenChange={(next) => !place.isPending && setConfirmOpen(next)}>
        <DialogContent size="sm" hideClose role="alertdialog" className="rounded-2xl p-6">
          <DialogHeader className="grid justify-items-center gap-3 pr-0 text-center">
            <span
              className={cn(
                "grid size-12 place-items-center rounded-2xl",
                paymentMethod === "khqr" ? "bg-lapis-tint text-primary" : "bg-success-tint text-success",
              )}
              aria-hidden="true"
            >
              {paymentMethod === "khqr" ? <QrCode className="size-6" /> : <ShieldCheck className="size-6" />}
            </span>
            <DialogTitle className="text-[1.45rem]">{k.confirmDialogTitle}</DialogTitle>
            <DialogDescription className="max-w-xs text-sm leading-relaxed">{k.confirmDialogLead}</DialogDescription>
          </DialogHeader>

          {data ? (
            <div className="mt-5 grid gap-2.5 rounded-xl border border-border bg-surface-1/60 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{dict.checkout.paymentMethod}</span>
                <span className="font-semibold text-foreground">{paymentMethod === "khqr" ? k.khqr : k.cod}</span>
              </div>
              {shipsSomething && selectedAddress ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{k.deliverTo}</span>
                  <span className="truncate font-medium text-foreground">
                    {selectedAddress.recipient_name}
                    {selectedAddress.city ? ` · ${selectedAddress.city}` : ""}
                  </span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-2.5">
                <span className="font-semibold text-foreground">
                  {k.total}{" "}
                  <span className="text-xs font-normal text-muted-foreground">({dict.cartPage.items(cart.data.item_count ?? 0)})</span>
                </span>
                <span className="font-display text-xl font-semibold tabular-nums text-primary">
                  {formatMoney(data.total?.usd, data.total?.khr, currency)}
                </span>
              </div>
              {paymentMethod === "khqr" ? (
                <p className="mt-0.5 flex items-start gap-1.5 rounded-lg bg-lapis-tint/65 px-2.5 py-2 text-xs leading-snug text-primary">
                  <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{k.khqrReady(khqr?.pay_minutes ?? 15)}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl font-semibold"
              disabled={place.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              {dict.ui.cancel}
            </Button>
            <Button
              type="button"
              variant="default"
              className="h-11 w-full rounded-xl font-semibold"
              loading={place.isPending}
              onClick={() => {
                setFormError(null);
                place.mutate();
              }}
            >
              {k.confirmDialogAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
