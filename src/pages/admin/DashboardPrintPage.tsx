import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { insightsQueries } from "@/api/endpoints/dashboardInsights";
import { staffQueries } from "@/api/endpoints/staff";
import { ErrorState } from "@/components/ui/error-state";
import { contact, shop } from "@/content/shop";
import { rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { PaymentMethods } from "@/features/admin/dashboard/PaymentMethods";
import { PrintFrame } from "@/features/orders/documents/PrintFrame";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";

function Rows({ title, rows }: { title: string; rows: Array<[string, string | number]> }) {
  return <section className="mt-6"><h2 className="mb-2 text-lg font-semibold">{title}</h2><table className="w-full text-left text-sm"><tbody>{rows.map(([label, value], index) => <tr key={`${label}-${index}`} className="border-b border-border"><th scope="row" className="p-2 font-normal">{label}</th><td className="p-2 text-right tabular-nums">{value}</td></tr>)}</tbody></table></section>;
}

export default function DashboardPrintPage() {
  const [params] = useSearchParams();
  const range = rangeFromParams(params);
  const summary = useQuery(staffQueries.summary(range));
  const insights = useQuery(insightsQueries.get(range));
  const { dict } = useT();
  const t = dict.dashboardPrint;
  const s = summary.data;
  const data = insights.data;
  const ready = !!s && !!data && !summary.isPlaceholderData && !insights.isPlaceholderData;
  const back = `/admin/reports?${new URLSearchParams(rangeToParams(range)).toString()}`;

  return (
    <PrintFrame title={t.title} backTo={back} backLabel={t.back} printLabel={t.print} ready={ready}>
      {summary.isError || insights.isError ? <ErrorState error={summary.error ?? insights.error} onRetry={() => { void summary.refetch(); void insights.refetch(); }} headingLevel="h2" showHomeLink={false} /> : !ready || !s || !data ? <p role="status">{t.loading}</p> : (
        <article className="paper-sheet dashboard-print-sheet">
          <header className="border-b border-border pb-4"><h2 className="text-2xl font-semibold">{shop.name}</h2><p>{contact.email} · {contact.phone}</p><p className="mt-2 text-lg font-semibold">{t.title}</p><p>{t.period}: {s.period.from} – {s.period.to} · {s.period.timezone}</p></header>
          <Rows title={t.title} rows={[
            [t.revenue, formatUsd(s.revenue.net_usd)], [t.orders, s.orders_placed], [t.customers, s.new_customers], [t.average, formatUsd(s.average_order_value_usd)],
            ...(s.books_sold === undefined ? [] : [[dict.dashboardCopies.books, s.books_sold] as [string, number]]),
            ...(s.ebooks_sold === undefined ? [] : [[dict.dashboardCopies.ebooks, s.ebooks_sold] as [string, number]]),
          ]} />
          <Rows title={t.statuses} rows={Object.entries(s.orders_by_status)} />
          <Rows title={t.best} rows={s.best_sellers.map((book) => [book.title, book.copies_sold])} />
          <Rows title={t.categories} rows={(s.top_categories ?? []).map((category) => [category.name, category.copies_sold])} />
          <section className="mt-6"><h2 className="mb-2 text-lg font-semibold">{dict.dashboardAnalysis.payments}</h2><p className="text-sm">{dict.dashboardAnalysis.paymentNote}</p><PaymentMethods rows={data.payment_methods ?? []} /></section>
          <Rows title={t.promotions} rows={[[t.offer, data.promotions.offer_orders], [t.coupon, data.promotions.coupon_orders], ...(data.promotions.gift_orders === undefined ? [] : [[t.gift, data.promotions.gift_orders] as [string, number]])]} />
          <Rows title={dict.dashboardAnalysis.reminder} rows={data.cart_reminder_recovery ? [[dict.dashboardAnalysis.sent, data.cart_reminder_recovery.sent], [dict.dashboardAnalysis.recovered, `${data.cart_reminder_recovery.recovered} (${data.cart_reminder_recovery.percent}%)`]] : []} />
          <p className="mt-2 text-sm">{dict.dashboardAnalysis.reminderNote}</p>
          <Rows title={dict.dashboardBuyers.title} rows={[[t.repeat, `${data.repeat_customer_rate.percent}%`], [t.returning, data.repeat_customer_rate.returning], [t.firstTime, data.repeat_customer_rate.customers - data.repeat_customer_rate.returning], [t.ratings, data.order_ratings?.average ?? t.none]]} />
          <Rows title={t.provinces} rows={data.provinces.map((province) => [province.name, province.orders])} />
          {data.delivery_areas ? <Rows title={dict.dashboardAreas.title} rows={[[dict.dashboardAreas.phnomPenh, data.delivery_areas.phnom_penh], [dict.dashboardAreas.provinces, data.delivery_areas.provinces], [dict.dashboardAreas.unknown, data.delivery_areas.unknown]]} /> : null}
        </article>
      )}
    </PrintFrame>
  );
}
