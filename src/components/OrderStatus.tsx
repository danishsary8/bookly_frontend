import type { ComponentType } from "react";
import { BadgeCheck, CheckCircle2, Clock3, PackageCheck, RotateCcw, Truck, WalletCards, XCircle } from "lucide-react";
import type { CustomerInvoice, ReturnRequest } from "../types/customer.types";
import { cn } from "@/lib/utils";

/*
 * Order + return status (MASTER §6.3 addendum). Each status differs by icon AND
 * fill style (tint / solid / dashed outline), never by colour alone, and always
 * carries its written label.
 */

type OrderStatus = CustomerInvoice["status"];
type ReturnStatus = ReturnRequest["status"];
type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const base = "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-bold uppercase leading-none tracking-[0.12em]";

const ORDER_STATUS: Record<OrderStatus, { label: string; Icon: Icon; className: string; description: string }> = {
  pending: { label: "Pending", Icon: Clock3, className: "bg-warning/12 text-warning", description: "Order placed and waiting for confirmation." },
  paid: { label: "Paid", Icon: WalletCards, className: "bg-lapis-tint text-primary", description: "Payment has been approved for your order." },
  processing: { label: "Processing", Icon: PackageCheck, className: "bg-lapis-tint text-primary", description: "Your books are being prepared for shipment." },
  shipped: { label: "Shipped", Icon: Truck, className: "bg-primary text-primary-foreground", description: "Your order is on the way with delivery tracking." },
  delivered: { label: "Delivered", Icon: CheckCircle2, className: "bg-success/12 text-success", description: "The order has arrived successfully." },
  cancelled: { label: "Cancelled", Icon: XCircle, className: "border-[1.5px] border-dashed border-muted-foreground text-muted-foreground", description: "This order was cancelled and its stock restored." },
};

const RETURN_STATUS: Record<ReturnStatus, { label: string; Icon: Icon; className: string }> = {
  requested: { label: "Requested", Icon: Clock3, className: "bg-warning/12 text-warning" },
  approved: { label: "Approved", Icon: BadgeCheck, className: "bg-lapis-tint text-primary" },
  received: { label: "Received", Icon: RotateCcw, className: "bg-primary text-primary-foreground" },
  refunded: { label: "Refunded", Icon: CheckCircle2, className: "bg-success/12 text-success" },
  rejected: { label: "Rejected", Icon: XCircle, className: "border-[1.5px] border-dashed border-destructive text-destructive" },
};

export const OrderStatusBadge = ({ status, className }: { status: OrderStatus; className?: string }) => {
  const meta = ORDER_STATUS[status] ?? ORDER_STATUS.pending;
  const { Icon } = meta;
  return (
    <span className={cn(base, meta.className, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      {meta.label}
    </span>
  );
};

export const ReturnStatusBadge = ({ status, className }: { status: ReturnStatus; className?: string }) => {
  const meta = RETURN_STATUS[status] ?? RETURN_STATUS.requested;
  const { Icon } = meta;
  return (
    <span className={cn(base, meta.className, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      {meta.label}
    </span>
  );
};

const STEPS: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered"];

/**
 * The existing 5-step tracking timeline, restyled: an ordered list where completed steps
 * are filled lapis, the current one is marked (aria-current="step") and labelled "Current",
 * and upcoming steps are outlined. Cancelled orders show a single cancelled state instead.
 */
export const OrderTimeline = ({ status }: { status: OrderStatus }) => {
  if (status === "cancelled") {
    const { Icon, description } = ORDER_STATUS.cancelled;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-muted-foreground p-4">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden={true} />
        <div>
          <p className="font-semibold text-foreground">Order cancelled</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  }

  const current = STEPS.indexOf(status);
  return (
    <ol className="grid gap-0 md:grid-cols-5">
      {STEPS.map((step, index) => {
        const { Icon, label, description } = ORDER_STATUS[step];
        const done = index < current;
        const isCurrent = index === current;
        const reached = index <= current;
        return (
          <li key={step} aria-current={isCurrent ? "step" : undefined} className="relative flex gap-3 pb-6 md:flex-col md:gap-3 md:pb-0 md:pr-4">
            {/* connector: vertical on mobile, horizontal on desktop */}
            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" className={cn("absolute left-[21px] top-11 h-[calc(100%-2.75rem)] w-0.5 md:left-11 md:top-[21px] md:h-0.5 md:w-[calc(100%-2.75rem)]", done ? "bg-primary" : "bg-border")} />
            ) : null}
            <span className={cn("relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2", reached ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
              <Icon className="h-5 w-5" aria-hidden={true} />
            </span>
            <div className="min-w-0 pt-1 md:pt-0">
              <p className={cn("text-sm font-semibold", reached ? "text-foreground" : "text-muted-foreground")}>
                {label}
                {isCurrent ? <span className="ml-2 rounded-sm bg-lapis-tint px-1.5 py-0.5 text-xs font-bold text-primary">Current</span> : null}
                <span className="sr-only">{done ? " (completed)" : isCurrent ? "" : " (upcoming)"}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
