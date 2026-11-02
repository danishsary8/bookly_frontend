import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Download, FlaskConical, Loader2, QrCode, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { Link, useNavigate, useParams } from "react-router-dom";
import { orderKeys, orderQueries } from "@/api/endpoints/orders";
import { paymentKeys, paymentQueries, paymentsApi, type KhqrCurrency, type KhqrPayment } from "@/api/endpoints/payments";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BuyAgainButton } from "@/features/orders/BuyAgainButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * /account/orders/:id/pay: pay a KHQR order (KHQR payments design 2026-11-02, part 1). A real, scannable KHQR in USD
 * or KHR, the time left, and the API asked every 3 seconds (it checks Bakong in bakong mode). Test mode adds a clearly
 * marked "Simulate payment" button. Paid -> a green screen, then the order page; time over -> the order was cancelled.
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
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    qrLib.toString(qr, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } }, (err, out) => {
      if (!cancelled && !err) setSvg(out);
    });
    return () => {
      cancelled = true;
    };
  }, [qr]);
  return svg ? (
    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt={label} className="aspect-square w-full" />
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

  return (
    // grid-cols-1: long (Khmer) labels wrap instead of making the column wider than a phone.
    <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-display text-[1.953rem] leading-tight">{t.title}</h1>
        <p className="text-muted-foreground">
          {t.order} <span className="tabular-nums">{data.order_number}</span>
        </p>
      </div>

      {data.status === "awaiting_payment" ? (
        <>
          {data.mode === "test" ? (
            <p className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-surface-1 p-3 text-sm">
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {t.testBanner}
            </p>
          ) : null}

          <div role="tablist" aria-label={t.currency} className="mx-auto inline-flex rounded-full border border-border bg-card p-1">
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
                  "min-h-11 rounded-full px-6 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "USD" ? t.usd : t.khr}
              </button>
            ))}
          </div>

          {/* The KHQR card keeps its official look (white with the red header) in light and dark mode. */}
          <div role="tabpanel" aria-label={currency === "USD" ? t.usd : t.khr} className="mx-auto w-full max-w-[20rem] overflow-hidden rounded-2xl bg-white text-[#0E1335] shadow-overlay ring-1 ring-black/5">
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

          <div className="grid justify-items-center gap-1 text-center">
            <p role="timer" aria-live="off" aria-label={t.timeLeftLabel(Math.ceil(secondsLeft / 60))} className={cn("flex items-center gap-2 text-2xl font-semibold tabular-nums", secondsLeft < 60 && "text-destructive")}>
              <Clock className="size-5" aria-hidden="true" /> {mm}:{ss}
            </p>
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t.waiting}
            </p>
          </div>

          <ol className="grid gap-1 rounded-xl border border-border bg-card p-4 text-[15px]">
            <li>1. {t.step1}</li>
            <li>2. {t.step2}</li>
            <li>3. {t.step3}</li>
          </ol>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => void download()} disabled={!qr?.qr}>
              <Download aria-hidden="true" /> {t.download}
            </Button>
            <Link to={`/account/orders/${orderId}`} className={buttonVariants({ variant: "ghost" })}>
              {t.viewOrder}
            </Link>
          </div>
          {data.mode === "test" ? (
            <Button onClick={() => simulate.mutate()} loading={simulate.isPending} className="h-auto min-h-11 w-full whitespace-normal py-2.5 text-center">
              <FlaskConical aria-hidden="true" /> {t.simulate}
            </Button>
          ) : null}
        </>
      ) : data.status === "paid" ? (
        <div role="status" className="grid justify-items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
          <p className="font-display text-2xl">{t.paid}</p>
          <p className="text-muted-foreground">{data.paid ? t.paidLead(money(data.paid.currency ?? "USD", data.paid.amount ?? "0", locale)) : null}</p>
          <Link to={`/account/orders/${orderId}`} className={buttonVariants()}>
            {t.viewOrder}
          </Link>
        </div>
      ) : (
        <div role="status" className="grid justify-items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <XCircle className="size-14 text-muted-foreground" aria-hidden="true" />
          <p className="font-display text-2xl">{data.status === "expired" ? t.expired : t.cancelled}</p>
          <p className="text-muted-foreground">{data.status === "expired" ? t.expiredLead : t.cancelledLead}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {order.data ? <BuyAgainButton order={order.data} /> : null}
            <Link to={`/account/orders/${orderId}`} className={buttonVariants({ variant: "ghost" })}>
              {t.viewOrder}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
