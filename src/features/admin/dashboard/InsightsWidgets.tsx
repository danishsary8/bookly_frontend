import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardInsights } from "@/api/endpoints/dashboardInsights";
import { Panel, Tile } from "@/features/admin/reportKit";
import { orderDate } from "@/features/orders/format";
import { formatLabel } from "@/lib/catalog";
import { formatUsd } from "@/stores/currency";

/*
 * The bookstore extras under the dashboard (BI design 2026-11-01, branch 4; owner 2A, 3A, 4A): stock value at selling
 * price, dead stock (in stock, no sale in 60 days), repeat customers, top authors, top provinces, and offers vs coupons.
 * Rendered only when /staff/dashboard/insights answered, so the dashboard works on an API without it.
 */

const count = (n: number) => n.toLocaleString("en-US");

/** A ranked row with a thin bar for its share of the top value (no chart library: one bar per row, text first). */
function BarRow({ label, value, max, detail }: { label: React.ReactNode; value: string; max: number; detail: number }) {
  const share = max > 0 ? Math.max(2, (detail / max) * 100) : 0;
  return (
    <li className="grid gap-1 py-2">
      <div className="flex items-baseline justify-between gap-3 text-[15px] tabular-nums">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
      </div>
    </li>
  );
}

export function InsightsWidgets({ data }: { data: DashboardInsights }) {
  const dead = data.dead_stock;
  const promo = data.promotions;
  const repeat = data.repeat_customer_rate;
  const topProvince = Math.max(0, ...data.provinces.map((p) => p.orders));
  const topAuthor = Math.max(0, ...data.top_authors.map((a) => a.copies_sold));
  const promoRows = [
    { key: "offer", label: "With an offer", orders: promo.offer_orders, discount: promo.offer_discount_usd },
    { key: "coupon", label: "With a coupon", orders: promo.coupon_orders, discount: promo.coupon_discount_usd },
    { key: "plain", label: "No discount", orders: promo.plain_orders, discount: null },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Stock value" value={formatUsd(data.stock_value.value_usd)} khr={data.stock_value.value_khr} detail={`${count(data.stock_value.copies)} printed copies · at selling price`} />
        <Tile label={`Dead stock (no sale in ${dead.days} days)`} value={formatUsd(dead.value_usd)} khr={dead.value_khr} detail={`${count(dead.copies)} copies of ${count(dead.variants)} ${dead.variants === 1 ? "format" : "formats"}`} />
        <Tile
          label="Repeat customers"
          value={repeat.customers ? `${repeat.percent.toLocaleString("en-US", { maximumFractionDigits: 1 })}%` : "–"}
          detail={repeat.customers ? `${count(repeat.returning)} of ${count(repeat.customers)} buyers had ordered before` : "No orders in this period"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          id="dead-stock"
          title="Slow movers"
          action={
            <Link to="/admin/stock" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Stock <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        >
          {dead.items.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">Every printed book in stock sold at least once in the last {dead.days} days.</p>
          ) : (
            <ul className="divide-y divide-border" aria-label={`In stock, no sale in ${dead.days} days, biggest value first`}>
              {dead.items.map((v) => (
                <li key={v.book_variant_id}>
                  <Link to={`/admin/books/${v.book_id}`} className="flex items-center justify-between gap-3 py-2 text-[15px] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{v.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {formatLabel(v.format)} · {v.stock_quantity} in stock · {v.last_sold_at ? `last sold ${orderDate(v.last_sold_at)}` : "never sold"}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatUsd(v.value_usd)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="top-authors" title="Top authors" action={<span className="text-sm text-muted-foreground">by copies in orders placed</span>}>
          {data.top_authors.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">No sales in this period yet.</p>
          ) : (
            <ul aria-label="Top authors by copies">
              {data.top_authors.map((a) => (
                <BarRow key={a.author_id} label={a.name} value={`${count(a.copies_sold)} · ${formatUsd(a.sales_usd)}`} max={topAuthor} detail={a.copies_sold} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="provinces" title="Orders by province" action={<span className="text-sm text-muted-foreground">from the delivery address</span>}>
          {data.provinces.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">No orders in this period yet.</p>
          ) : (
            <ul aria-label="Orders by province">
              {data.provinces.map((p) => (
                <BarRow
                  key={p.code ?? "unknown"}
                  label={p.code ? p.name : <span className="text-muted-foreground">Unknown province</span>}
                  value={`${count(p.orders)} · ${formatUsd(p.total_usd)}`}
                  max={topProvince}
                  detail={p.orders}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          id="promotions"
          title="Offers and coupons"
          action={
            <Link to="/admin/reports?tab=offers" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Offers report <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        >
          {promo.orders === 0 ? (
            <p className="text-[15px] text-muted-foreground">No orders in this period yet.</p>
          ) : (
            <table className="w-full text-left text-[15px] tabular-nums">
              <caption className="sr-only">Orders placed in this period by discount</caption>
              <thead className="text-sm text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2 font-normal">Orders</th>
                  <th scope="col" className="pb-2 pl-4 text-right font-normal">Count</th>
                  <th scope="col" className="pb-2 pl-4 text-right font-normal">Share</th>
                  <th scope="col" className="pb-2 pl-4 text-right font-normal">Discount given</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {promoRows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className="py-2 font-normal">{r.label}</th>
                    <td className="py-2 pl-4 text-right font-semibold">{count(r.orders)}</td>
                    <td className="py-2 pl-4 text-right text-muted-foreground">{Math.round((r.orders / promo.orders) * 100)}%</td>
                    <td className="py-2 pl-4 text-right">{r.discount ? formatUsd(r.discount) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
