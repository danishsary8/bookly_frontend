import "./khqr-pay.css";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Download, FlaskConical, Loader2, QrCode, ShieldCheck, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { Link, useNavigate, useParams } from "react-router-dom";
import { orderKeys, orderQueries } from "@/api/endpoints/orders";
import { paymentKeys, paymentQueries, paymentsApi, type KhqrCurrency, type KhqrPayment } from "@/api/endpoints/payments";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Seal } from "@/components/shopping/Seal";
import { BuyAgainButton } from "@/features/orders/BuyAgainButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * /account/orders/:id/pay: pay a KHQR order (KHQR payments design 2026-11-02, part 1). A real, scannable KHQR in USD
 * or KHR, the time left, and the API asked every 3 seconds (it checks Bakong in bakong mode). Test mode adds a clearly
 * marked "Simulate payment" button. Paid -> a green screen, then the order page; time over -> the order was cancelled.
 * Layout (pages/shopping.md): the official KHQR card on a lit lapis stage; beside it the amount, USD/KHR switch, a
 * countdown ring, the three steps and the actions. Paid / expired / cancelled: one centred panel.
 */

const qrLib = (QRCode as unknown as { default?: typeof QRCode })?.default || QRCode;

const money = (currency: string, amount: string, locale: string[]) =>
  currency === "KHR"
    ? `${Number(amount).toLocaleString(locale)} ៛`
    : `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Seconds left, counted down locally from the API's answer (so the phone's clock does not matter). */
function useSecondsLeft(data: KhqrPayment | undefined, updatedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!data || data.status !== "awaiting_payment") return 0;
  return Math.max(0, Math.round((data.seconds_left ?? 0) - (now - updatedAt) / 1000));
}

function QrImage({ qr, label }: { qr: string; label: string }) {
  const [image, setImage] = useState<{ qr: string; svg: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    qrLib.toString(qr, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } }, (err, out) => {
      if (!cancelled && !err) setImage({ qr, svg: out });
    });
    return () => {
      cancelled = true;
    };
  }, [qr]);
  return image?.qr === qr ? (
    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(image.svg)}`} alt={label} className="aspect-square w-full" />
  ) : (
    <Skeleton className="aspect-square w-full" />
  );
}

export default function KhqrPayPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const valid = Number.isInteger(orderId) && orderId > 0;
  const { dict, locale } = useT();
  const t = dict.pay;
  useDocumentTitle(t.docTitle);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const payment = useQuery({ ...paymentQueries.khqr(orderId), enabled: valid });
  const data = payment.data;
  const secondsLeft = useSecondsLeft(data, payment.dataUpdatedAt);
  // The time that was left when the page opened: the countdown ring's full circle.
  const [startLeft, setStartLeft] = useState(0);
  if (data?.status === "awaiting_payment" && startLeft === 0) setStartLeft(Math.max(1, data.seconds_left ?? 0));
  const [currency, setCurrency] = useState<KhqrCurrency>("USD");
  const qr = data?.qrs?.find((q) => q.currency === currency);
  const order = useQuery({ ...orderQueries.order(orderId), enabled: valid && (data?.status === "expired" || data?.status === "cancelled") });

  const put = (next: KhqrPayment) => queryClient.setQueryData(paymentKeys.khqr(orderId), next);
  const askQr = useMutation({
    mutationFn: (c: KhqrCurrency) => paymentsApi.khqrQr(orderId, c),
    onSuccess: put,
    onError: (error) => {
      setCurrency("USD");
      toast.error({ title: t.rielFailed, description: ApiError.from(error).message });
    },
  });
  const simulate = useMutation({
    mutationFn: () => paymentsApi.simulate(orderId),
    onSuccess: put,
    onError: (error) => toast.error({ title: t.simulateFailed, description: ApiError.from(error).message }),
  });

  // Paid: refresh the order everywhere, then go to it.
  const paid = data?.status === "paid";
  useEffect(() => {
    if (!paid) return;
    void queryClient.invalidateQueries({ queryKey: orderKeys.order(orderId) });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    const timer = window.setTimeout(() => navigate(`/account/orders/${orderId}`, { replace: true }), 3500);
    return () => window.clearTimeout(timer);
  }, [paid, orderId, navigate, queryClient]);

  // The countdown reached 0: ask the API now (it cancels the order and gives the stock back).
  const over = data?.status === "awaiting_payment" && secondsLeft === 0;
  useEffect(() => {
    if (over) void payment.refetch();
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = useMemo(
    () => async () => {
      if (!qr?.qr) return;
      const url = await qrLib.toDataURL(qr.qr, { margin: 2, width: 640, errorCorrectionLevel: "M" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookly-${data?.order_number ?? orderId}-${currency}.png`;
      a.click();
    },
    [qr, data?.order_number, orderId, currency],
  );

  if (!valid || (payment.isError && ApiError.from(payment.error).status === 404)) {
    return (
      <EmptyState
        icon={QrCode}
        headingLevel="h1"
        title={t.notFound}
        description={t.notFoundLead}
        action={
          <Link to="/account/orders" className={buttonVariants()}>
            {dict.orders.allOrders}
          </Link>
        }
      />
    );
  }
  if (payment.isError) return <ErrorState error={payment.error} onRetry={() => void payment.refetch()} />;
  if (!data) {
    return (
      <div className="mx-auto grid w-full max-w-sm gap-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const amount = qr ? money(qr.currency ?? currency, qr.amount ?? "0", locale) : "";
  const s = dict.shopping;

  if (data.status === "paid" || data.status === "expired" || data.status === "cancelled") {
    const paidNow = data.status === "paid";
    return (
      <div role="status" ref={(el) => el?.scrollIntoView?.({ block: "nearest" })} className="shop-card mx-auto grid w-full max-w-xl justify-items-center gap-4 rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-12">
        {paidNow ? (
          <Seal className="size-20" />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-surface-2 text-muted-foreground">
            <XCircle className="size-10" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
        <h1 className="font-display text-[2.2rem] leading-tight">{paidNow ? t.paid : data.status === "expired" ? t.expired : t.cancelled}</h1>
        <p className="text-sm text-muted-foreground">
          {t.order} <span className="tabular-nums">{data.order_number}</span>
        </p>
        <p className="max-w-md text-muted-foreground">
          {paidNow ? (data.paid ? t.paidLead(money(data.paid.currency ?? "USD", data.paid.amount ?? "0", locale)) : null) : data.status === "expired" ? t.expiredLead : t.cancelledLead}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {!paidNow && order.data ? <BuyAgainButton order={order.data} /> : null}
          <Link to={`/account/orders/${orderId}`} className={buttonVariants({ variant: paidNow ? "default" : "ghost" })}>
            {t.viewOrder}
          </Link>
        </div>
      </div>
    );
  }

  // Countdown ring: the share of the time that was left when this page opened.
  const ringC = 2 * Math.PI * 26;
  const share = startLeft > 0 ? secondsLeft / startLeft : 0;

  return (
    // grid-cols-1 below lg: long (Khmer) labels wrap instead of making the column wider than a phone.
    <div className="grid w-full grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-10">
      {/* The stage: the KHQR card keeps its official look (white with the red header) in light and dark mode,
          lit on a deep lapis panel like the home page's posters. */}
      <div className="premiere-stage relative isolate grid justify-items-center gap-5 overflow-hidden rounded-3xl px-6 py-8 sm:px-10">
        <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_45%,rgb(154_166_255/0.35),transparent)]" aria-hidden="true" />
        <div role="tabpanel" aria-label={currency === "USD" ? t.usd : t.khr} className="w-full max-w-[19rem] overflow-hidden rounded-2xl bg-white text-[#0E1335] shadow-[0_30px_60px_-28px_rgb(0_0_0/0.75)] ring-1 ring-black/5">
          <div className="flex h-12 items-center justify-center bg-[#E1232E] text-lg font-bold tracking-[0.2em] text-white">KHQR</div>
          <div className="grid gap-1 px-6 pb-3 pt-4">
            <p className="text-sm">Bookly</p>
            <p className="text-[1.75rem] font-bold leading-tight tabular-nums">{amount || "…"}</p>
          </div>
          <div className="mx-6 border-t border-dashed border-black/20" />
          <div className="p-6">
            {qr?.qr && !askQr.isPending ? <QrImage qr={qr.qr} label={t.qrAlt(amount, data.order_number ?? "")} /> : <Skeleton className="aspect-square w-full bg-black/5" />}
          </div>
        </div>
        <p className="flex items-center gap-2 text-center text-sm text-[#DDE2FB]">
          <ShieldCheck className="size-4 shrink-0 text-gold" aria-hidden="true" /> {s.secured}
        </p>
      </div>

      <div className="khqr-payment-info grid min-w-0 gap-5">
        <div className="grid gap-2">
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {s.paymentLabel}
          </p>
          <h1 className="font-display text-[2.441rem] leading-[1.08]">{t.title}</h1>
          <p className="text-muted-foreground">
            {t.order} <span className="tabular-nums">{data.order_number}</span>
          </p>
        </div>

        {data.mode === "test" ? (
          <p className="flex items-start gap-2 rounded-xl border border-dashed border-input bg-card p-3 text-sm">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {t.testBanner}
          </p>
        ) : null}

        {/* Currency and the time left, side by side (the amount is on the KHQR card). */}
        <div className="khqr-payment-status shop-card grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="grid gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t.currency}</p>
            <div role="tablist" aria-label={t.currency} className="inline-flex justify-self-start rounded-full border border-border bg-surface-2/60 p-1">
              {(["USD", "KHR"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={currency === c}
                  onClick={() => {
                    setCurrency(c);
                    if (!data.qrs?.some((q) => q.currency === c)) askQr.mutate(c);
                  }}
                  className={cn(
                    "min-h-11 rounded-full px-5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    currency === c ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c === "USD" ? t.usd : t.khr}
                </button>
              ))}
            </div>
          </div>
          <div className="khqr-countdown flex items-center gap-3">
            <span className="relative grid size-12 shrink-0 place-items-center">
              <svg viewBox="0 0 60 60" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                <circle cx="30" cy="30" r="26" fill="none" strokeWidth="4" className="stroke-surface-2" />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringC * (1 - share)}
                  className={cn("transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none", secondsLeft < 60 ? "stroke-destructive" : "stroke-primary")}
                />
              </svg>
              <Clock className={cn("size-5", secondsLeft < 60 ? "text-destructive" : "text-primary")} aria-hidden="true" />
            </span>
            <div className="grid">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{s.timeLeft}</span>
              <p role="timer" aria-live="off" aria-label={t.timeLeftLabel(Math.ceil(secondsLeft / 60))} className={cn("text-2xl font-semibold tabular-nums", secondsLeft < 60 && "text-destructive")}>
                {mm}:{ss}
              </p>
            </div>
          </div>
          <p role="status" className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:col-span-2">
            <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" /> {t.waiting}
          </p>
        </div>

        <section aria-labelledby="how-to-pay" className="grid gap-3">
          <h2 id="how-to-pay" className="font-sans text-lg font-semibold">
            {s.howToPay}
          </h2>
          <ol className="grid gap-3">
            {[t.step1, t.step2, t.step3].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lapis-tint text-sm font-bold text-primary" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="khqr-payment-actions grid gap-3 sm:grid-cols-2">
          <Button variant="default" className="h-12 rounded-xl text-sm" onClick={() => void download()} disabled={!qr?.qr}>
            <Download aria-hidden="true" /> {t.download}
          </Button>
          <Link to={`/account/orders/${orderId}`} className={buttonVariants({ variant: "outline", className: "h-12 rounded-xl text-sm" })}>
            {t.viewOrder}
          </Link>
        </div>
        {data.mode === "test" ? (
          <Button onClick={() => simulate.mutate()} loading={simulate.isPending} className="h-auto min-h-11 w-full whitespace-normal py-2.5 text-center">
            <FlaskConical aria-hidden="true" /> {t.simulate}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
