import type { Order, OrderStatus } from "@/api/types";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { cn } from "@/lib/utils";
import { orderDateTime } from "./format";

type History = NonNullable<Order["status_history"]>;

/** The order's status changes, oldest first, with the shop's notes; the latest is marked as current. */
export function OrderTimeline({ history }: { history: History }) {
  if (history.length === 0) return null;
  return (
    <section aria-labelledby="order-timeline" className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 id="order-timeline" className="font-display text-[1.563rem] leading-tight">
        Timeline
      </h2>
      <ol className="mt-5 grid">
        {history.map((entry, i) => {
          const last = i === history.length - 1;
          return (
            <li key={`${entry.status}-${entry.created_at}-${i}`} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 pb-6 last:pb-0">
              {/* The line runs from under this dot to the next one. */}
              {last ? null : <span className="absolute top-5 -bottom-2 left-[calc(0.625rem-0.5px)] w-px bg-border" aria-hidden="true" />}
              <span className="flex justify-center" aria-hidden="true">
                <span className={cn("mt-2 size-3 rounded-full border-2", last ? "border-primary bg-primary" : "border-input bg-card")} />
              </span>
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <OrderStatusBadge status={entry.status as OrderStatus} />
                  <time dateTime={entry.created_at} className="text-sm text-muted-foreground">
                    {orderDateTime(entry.created_at)}
                  </time>
                  {last ? <span className="sr-only">(current status)</span> : null}
                </div>
                {entry.note ? <p className="text-[15px] text-muted-foreground">{entry.note}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
