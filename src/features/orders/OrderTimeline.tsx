import type { ComponentType } from "react";
import { CalendarClock, Check, ClipboardCheck, Home, Package, RotateCcw, Truck, WalletCards, XCircle } from "lucide-react";
import type { Order, OrderStatus } from "@/api/types";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { cn } from "@/lib/utils";
import { orderDateTime, orderShortDate } from "./format";
import { useT, type Translations } from "@/i18n";

/** Customer view: status, note, time. The staff view adds who made the change. */
type History = Array<NonNullable<Order["status_history"]>[number] & { changed_by?: { name: string } | null }>;

type StepKey = "pending" | "paid" | "processing" | "shipped" | "delivered";

interface StepMeta {
  key: StepKey;
  labelKey: "stepPlaced" | "stepPaid" | "stepPreparing" | "stepShipped" | "stepDelivered";
  Icon: ComponentType<{ className?: string }>;
}

const STEP_META: Record<StepKey, StepMeta> = {
  pending: { key: "pending", labelKey: "stepPlaced", Icon: ClipboardCheck },
  paid: { key: "paid", labelKey: "stepPaid", Icon: WalletCards },
  processing: { key: "processing", labelKey: "stepPreparing", Icon: Package },
  shipped: { key: "shipped", labelKey: "stepShipped", Icon: Truck },
  delivered: { key: "delivered", labelKey: "stepDelivered", Icon: Home },
};

const HEADLINE_BY_STATUS: Record<
  OrderStatus,
  {
    title: keyof Pick<
      Translations["orderParts"],
      "headlinePending" | "headlinePaid" | "headlineProcessing" | "headlineShipped" | "headlineDelivered" | "headlineCancelled" | "headlineReturned"
    >;
    sub: keyof Pick<
      Translations["orderParts"],
      "subPending" | "subPaid" | "subProcessing" | "subShipped" | "subDelivered" | "subCancelled" | "subReturned"
    >;
    tone: string;
  }
> = {
  pending: { title: "headlinePending", sub: "subPending", tone: "text-primary" },
  paid: { title: "headlinePaid", sub: "subPaid", tone: "text-primary" },
  processing: { title: "headlineProcessing", sub: "subProcessing", tone: "text-primary" },
  shipped: { title: "headlineShipped", sub: "subShipped", tone: "text-success" },
  delivered: { title: "headlineDelivered", sub: "subDelivered", tone: "text-success" },
  cancelled: { title: "headlineCancelled", sub: "subCancelled", tone: "text-destructive" },
  returned: { title: "headlineReturned", sub: "subReturned", tone: "text-foreground" },
};

/**
 * Order progress tracker + chronological activity log.
 * Shows an Amazon-inspired horizontal milestone bar for active/delivered orders,
 * a clear status banner for cancelled/returned orders, and the full timestamped log below.
 */
export function OrderTimeline({
  history,
  status,
  paymentMethod,
  paymentStatus,
  estimatedDelivery,
}: {
  history: History;
  status?: OrderStatus;
  paymentMethod?: Order["payment_method"];
  paymentStatus?: Order["payment_status"];
  estimatedDelivery?: Order["estimated_delivery"];
}) {
  const { dict, lang, locale } = useT();
  const t = dict.orderParts;
  if (history.length === 0) return null;

  const latestEntry = history[history.length - 1];
  const currentStatus = (status ?? latestEntry?.status) as OrderStatus | undefined;
  const isTerminalNegative = currentStatus === "cancelled" || currentStatus === "returned";

  // Include the Paid milestone when payment is KHQR/card or explicitly recorded in history.
  const includePaid =
    paymentMethod === "khqr" ||
    paymentMethod === "card" ||
    currentStatus === "paid" ||
    history.some((entry) => entry.status === "paid");

  const stepKeys: StepKey[] = includePaid
    ? ["pending", "paid", "processing", "shipped", "delivered"]
    : ["pending", "processing", "shipped", "delivered"];

  // Map each milestone status to the first timestamp it was reached in history.
  const reachedAt = new Map<string, string>();
  for (const entry of history) {
    if (entry.status && entry.created_at && !reachedAt.has(entry.status)) {
      reachedAt.set(entry.status, entry.created_at);
    }
  }

  const activeIndex = currentStatus ? stepKeys.indexOf(currentStatus as StepKey) : -1;
  const progressPercent = activeIndex > 0 && stepKeys.length > 1 ? (activeIndex / (stepKeys.length - 1)) * 100 : 0;
  const headlineMeta = currentStatus ? HEADLINE_BY_STATUS[currentStatus] : undefined;
  const awaitingKhqrPayment = currentStatus === "pending" && paymentMethod === "khqr" && paymentStatus !== "succeeded";
  const headlineTitle = awaitingKhqrPayment ? t.headlinePendingKhqr : headlineMeta ? t[headlineMeta.title] : null;
  const headlineSub = awaitingKhqrPayment ? t.subPendingKhqr : headlineMeta ? t[headlineMeta.sub] : null;
  const estimateText =
    estimatedDelivery?.formatted ??
    (lang === "km" ? estimatedDelivery?.delivery_time_km : estimatedDelivery?.delivery_time_en) ??
    estimatedDelivery?.delivery_time_en;
  const showEstimate =
    Boolean(estimateText) &&
    currentStatus !== "delivered" &&
    currentStatus !== "cancelled" &&
    currentStatus !== "returned";

  return (
    <section aria-labelledby="order-timeline" className="shop-card overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6">
      {/* Header: accessible "Timeline" eyebrow + prominent status headline + ETA pill */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="order-timeline" className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t.timeline}
          </h2>
          {headlineMeta && headlineTitle ? (
            <>
              <p className={cn("font-display text-[1.65rem] leading-tight sm:text-[1.85rem]", headlineMeta.tone)}>
                {headlineTitle}
              </p>
              <p className="text-sm text-muted-foreground">{headlineSub}</p>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showEstimate && estimateText ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/70 px-3 py-1 text-xs font-semibold text-foreground">
              <CalendarClock className="size-3.5 text-primary" aria-hidden="true" />
              {t.estimatedArrival(estimateText)}
            </span>
          ) : null}
          {currentStatus ? <OrderStatusBadge status={currentStatus} /> : null}
        </div>
      </div>

      {/* Milestone progress tracker */}
      {isTerminalNegative ? (
        <div
          className={cn(
            "mt-5 flex items-start gap-3.5 rounded-xl border p-4",
            currentStatus === "cancelled"
              ? "border-destructive/25 bg-destructive-tint/45"
              : "border-border bg-surface-2/60",
          )}
        >
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full",
              currentStatus === "cancelled"
                ? "bg-destructive/15 text-destructive"
                : "bg-foreground/10 text-foreground",
            )}
            aria-hidden="true"
          >
            {currentStatus === "cancelled" ? <XCircle className="size-5" /> : <RotateCcw className="size-5" />}
          </span>
          <div className="grid gap-0.5 text-sm">
            <p className="font-semibold text-foreground">
              {headlineMeta ? t[headlineMeta.title] : dict.orderStatus[currentStatus]}
            </p>
            {latestEntry?.created_at ? (
              <time dateTime={latestEntry.created_at} className="text-xs tabular-nums text-muted-foreground">
                {orderDateTime(latestEntry.created_at, locale)}
              </time>
            ) : null}
          </div>
        </div>
      ) : activeIndex >= 0 ? (
        <>
          {/* Desktop / Tablet horizontal milestone stepper */}
          <div className="mt-7 hidden sm:block" aria-hidden="true">
            <div className="relative">
              {/* Background + filled connector track spanning dead-center between first and last nodes */}
              <div
                className="absolute top-[22px] h-[3px] -translate-y-1/2 rounded-full bg-border"
                style={{ left: `${50 / stepKeys.length}%`, right: `${50 / stepKeys.length}%` }}
              >
                <div
                  className="h-full rounded-full bg-success transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div
                className="relative grid"
                style={{ gridTemplateColumns: `repeat(${stepKeys.length}, minmax(0, 1fr))` }}
              >
                {stepKeys.map((key, index) => {
                  const meta = STEP_META[key];
                  const Icon = meta.Icon;
                  const completed = index < activeIndex;
                  const active = index === activeIndex;
                  const date = reachedAt.get(key);
                  return (
                    <div key={key} className="flex flex-col items-center px-1 text-center">
                      <div className="grid h-11 place-items-center">
                        <span
                          className={cn(
                            "relative z-10 grid place-items-center rounded-full transition-all duration-300 motion-reduce:transition-none",
                            active
                              ? "size-11 bg-success text-success-foreground shadow-sm ring-[5px] ring-success/20"
                              : completed
                                ? "size-10 bg-success text-success-foreground shadow-xs"
                                : "size-10 border-2 border-border bg-card text-muted-foreground/75",
                          )}
                        >
                          {completed ? (
                            <Check className="size-5 stroke-[2.6]" />
                          ) : (
                            <Icon className={cn(active ? "size-5" : "size-[18px]")} />
                          )}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "mt-2.5 text-[13.5px] leading-snug",
                          active || completed ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                        )}
                      >
                        {t[meta.labelKey]}
                      </span>
                      {date ? (
                        <span className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {orderShortDate(date, locale)}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile vertical milestone stepper */}
          <div className="mt-6 grid sm:hidden" aria-hidden="true">
            {stepKeys.map((key, index) => {
              const meta = STEP_META[key];
              const Icon = meta.Icon;
              const completed = index < activeIndex;
              const active = index === activeIndex;
              const lastStep = index === stepKeys.length - 1;
              const date = reachedAt.get(key);
              return (
                <div key={key} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3.5 pb-5 last:pb-0">
                  {lastStep ? null : (
                    <span
                      className={cn(
                        "absolute left-[19px] top-10 -bottom-1 w-[3px] rounded-full",
                        completed ? "bg-success" : "bg-border",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 grid size-10 place-items-center rounded-full",
                      active
                        ? "bg-success text-success-foreground shadow-sm ring-4 ring-success/20"
                        : completed
                          ? "bg-success text-success-foreground"
                          : "border-2 border-border bg-card text-muted-foreground/75",
                    )}
                  >
                    {completed ? <Check className="size-4 stroke-[2.6]" /> : <Icon className="size-[18px]" />}
                  </span>
                  <div className="flex flex-col justify-center">
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        active || completed ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                      )}
                    >
                      {t[meta.labelKey]}
                    </span>
                    {date ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {orderShortDate(date, locale)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Detailed chronological activity log */}
      <div className="mt-6 border-t border-border/80 pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t.activityLog}</p>
        <ol className="mt-3.5 grid">
          {history.map((entry, i) => {
            const last = i === history.length - 1;
            return (
              <li key={`${entry.status}-${entry.created_at}-${i}`} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3.5 pb-5 last:pb-0">
                {last ? null : <span className="absolute top-5 -bottom-1 left-[calc(0.625rem-0.5px)] w-px bg-border" aria-hidden="true" />}
                <span className="flex justify-center" aria-hidden="true">
                  <span
                    className={cn(
                      "mt-1.5 size-2.5 rounded-full border-2",
                      last
                        ? currentStatus === "cancelled"
                          ? "border-destructive bg-destructive"
                          : currentStatus === "delivered" || currentStatus === "shipped"
                            ? "border-success bg-success"
                            : "border-primary bg-primary"
                        : "border-input bg-card",
                    )}
                  />
                </span>
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <OrderStatusBadge status={entry.status as OrderStatus} />
                    <time dateTime={entry.created_at} className="text-xs tabular-nums text-muted-foreground sm:text-sm">
                      {orderDateTime(entry.created_at, locale)}
                    </time>
                    {last ? <span className="sr-only">{t.currentStatus}</span> : null}
                  </div>
                  {entry.note ? <p className="text-sm text-muted-foreground sm:text-[15px]">{entry.note}</p> : null}
                  {entry.changed_by ? <p className="text-xs text-muted-foreground sm:text-sm">{t.byStaff(entry.changed_by.name)}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
