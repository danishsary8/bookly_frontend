import type { DashboardInsights } from "@/api/endpoints/dashboardInsights";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";

/** One colour per method (admin.css tones); the table always repeats every value as text. */
const COLOUR: Record<string, string> = { cod: "var(--tone-amber-ink)", khqr: "var(--tone-rose-ink)", card: "var(--tone-blue-ink)", wallet: "var(--tone-teal-ink)" };
const colour = (method: string) => COLOUR[method] ?? "var(--tone-slate-ink)";

export function PaymentMethods({ rows }: { rows: NonNullable<DashboardInsights["payment_methods"]> }) {
  const credit = useT().dict.credit;
  const t = useT().dict.dashboardAnalysis;
  if (!rows.length) return <p className="text-muted-foreground">{t.empty}</p>;
  const label = (method: string) => method === "cod" ? t.cod : method === "khqr" ? t.khqr : method === "card" ? t.card : method === "wallet" ? credit.balance : method;

  return (
    <div className="grid gap-4">
      <div aria-hidden="true" className="flex h-3.5 w-full gap-1">
        {rows.filter((row) => row.percent > 0).map((row, i, all) => (
          <span key={row.method} className="group relative h-full" style={{ width: `${Math.max(2, Math.min(100, row.percent))}%` }}>
            <span className="admin-bar block h-full rounded-full transition-[filter] duration-200 group-hover:brightness-110" style={{ background: colour(row.method), animationDelay: `${i * 90}ms` }} />
            <span className={`admin-pop pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs font-semibold tabular-nums shadow-overlay group-hover:block ${i === all.length - 1 ? "right-0" : i === 0 ? "left-0" : "left-1/2 -translate-x-1/2"}`}>
              {label(row.method)} · {row.percent}% · {formatUsd(row.total_usd)}
            </span>
          </span>
        ))}
      </div>
      <div role="group" aria-label={t.payments} tabIndex={0} className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <table className="w-full text-left text-[15px] tabular-nums">
          <thead><tr>{[t.method, t.orders, t.amount, t.share].map((heading, i) => <th scope="col" key={heading} className={`px-2 py-2.5 ${i ? "text-right" : ""}`}>{heading}</th>)}</tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.method} className="border-t border-border">
              <th scope="row" className="px-2 py-3 font-semibold"><span className="flex items-center gap-2.5"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: colour(row.method) }} />{label(row.method)}</span></th>
              <td className="px-2 py-3 text-right">{row.orders}</td>
              <td className="px-2 py-3 text-right font-semibold">{formatUsd(row.total_usd)}</td>
              <td className="px-2 py-3 text-right">{row.percent}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
