import type { DashboardInsights } from "@/api/endpoints/dashboardInsights";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";

export function PaymentMethods({ rows }: { rows: NonNullable<DashboardInsights["payment_methods"]> }) {
  const t = useT().dict.dashboardAnalysis;
  if (!rows.length) return <p>{t.empty}</p>;
  const label = (method: string) => method === "cod" ? t.cod : method === "khqr" ? t.khqr : method === "card" ? t.card : method;

  return (
    <div role="region" aria-label={t.payments} tabIndex={0} className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
      <table className="w-full text-left text-sm tabular-nums">
        <thead><tr>{[t.method, t.orders, t.amount, t.share].map((heading) => <th scope="col" key={heading} className="p-2">{heading}</th>)}</tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.method} className="border-t border-border">
            <th scope="row" className="p-2">{label(row.method)}</th>
            <td className="p-2">{row.orders}</td>
            <td className="p-2">{formatUsd(row.total_usd)}</td>
            <td className="p-2">{row.percent}%<span aria-hidden="true" className="mt-1 block h-1.5 min-w-24 rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, row.percent))}%` }} /></span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
