import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PiggyBank } from "lucide-react";
import { Link } from "react-router-dom";
import { reportQueries } from "@/api/endpoints/reports";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/features/admin/dashboard/AnimatedNumber";
import { Change, Khr, Panel } from "@/features/admin/reportKit";
import { autoGroup } from "@/features/admin/reports/reportData";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";

const money = (n: number) => formatUsd(n.toFixed(2));

/**
 * Dashboard → Profit for the same days: gross profit with its margin, book sales, cost of books sold and restock
 * spending, linking to Reports → Profit. Hidden on an API without the profit report (404) or if it fails, so the
 * rest of the dashboard is never blocked by it.
 */
export function ProfitGlance({ from, to, link, versus = "", opening = false }: { from: string; to: string; link: string; versus?: string; opening?: boolean }) {
  const { dict } = useT();
  const t = dict.profitReport;
  const range = { from, to };
  const query = useQuery(reportQueries.report("profit", { ...range, group: autoGroup(range) }));
  // Hidden when unavailable or answered with an unexpected shape (older API, proxy), never blocking the dashboard.
  if (query.isError || (query.data !== undefined && (typeof query.data !== "object" || !("totals" in query.data) || !query.data.totals))) return null;
  const r = query.data;
  const now = r?.totals;
  const c = r?.comparison;

  return (
    <Panel
      id="dash-profit"
      title={t.dashboardTitle}
      icon={PiggyBank}
      tone="sea"
      action={
        <Link to={link} className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          {t.dashboardView} <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
        </Link>
      }
    >
      {!now || !c ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : (
        <>
          <dl className="dash-profit-metrics grid gap-3">
            <div className="grid content-start gap-1 rounded-xl bg-[var(--tone-tint)] px-4 py-3.5">
              <dt className="text-sm font-semibold">{t.profit}</dt>
              <dd className="grid gap-1">
                <span className="text-2xl font-semibold tabular-nums"><AnimatedNumber countUp={opening} value={Number(now.gross_profit_usd)} format={money} /></span>
                <Khr value={now.gross_profit_khr} />
                <span className="text-sm text-muted-foreground tabular-nums">{now.margin_percent == null ? t.noMargin : t.margin.replace("{p}", `${now.margin_percent}%`)}</span>
                <Change percent={c.change_percent.gross_profit} previous={Number(c.totals.gross_profit_usd)} versus={versus} />
              </dd>
            </div>
            {([
              [t.sales, now.sales_usd, now.sales_khr],
              [t.cost, now.cost_of_goods_usd, now.cost_of_goods_khr],
              [t.spend, now.restock_spend_usd, now.restock_spend_khr],
            ] as const).map(([label, usd, khr]) => (
              <div key={label} className="grid content-start gap-1 rounded-xl border border-border px-4 py-3.5">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="grid gap-0.5">
                  <span className="text-xl font-semibold tabular-nums"><AnimatedNumber countUp={opening} value={Number(usd)} format={money} /></span>
                  <Khr value={khr} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            {t.dashboardNote}
            {now.units_sold_cost_unknown > 0 ? ` · ${t.unknownWarning.replace("{amount}", formatUsd(now.sales_cost_unknown_usd)).replace("{n}", String(now.units_sold_cost_unknown))}` : ""}
          </p>
        </>
      )}
    </Panel>
  );
}
