import { AlertTriangle, ArrowRight, CircleHelp, FolderTree, LineChart, PackagePlus, PiggyBank, Receipt, ShoppingBag, Trophy, Truck, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/errors";
import type { ReportGroup, ReportRange } from "@/api/endpoints/reports";
import { AnimatedNumber } from "@/features/admin/dashboard/AnimatedNumber";
import { Kpi, RankTable } from "@/features/admin/dashboard/DashKit";
import { Change, Panel } from "@/features/admin/reportKit";
import { ColumnChart, DataTable, TrendChart, type Point } from "@/features/admin/reports/charts";
import { Empty, GroupPicker, State } from "@/features/admin/reports/reportParts";
import { useReport } from "@/features/admin/reports/reportData";
import { useT } from "@/i18n";
import { formatLabel } from "@/lib/catalog";
import { formatUsd } from "@/stores/currency";

/*
 * Reports → Profit (owner 2026-11-16, Phase 1): what restocking cost, what the books sold for and what was left.
 * Same look as the dashboard: four tinted KPI cards with trend lines, then charts and ranked tables in toned panels.
 * Sales without a known restock cost are kept out of profit and listed, so staff can add the cost next time.
 */

/** "day" → "Day" for the switch (Khmer has no capitals, so it is unchanged). */
const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const money = (n: number) => formatUsd(n.toFixed(2));
const count = (n: number) => Math.round(n).toLocaleString("en-US");
const usdAxis = (n: number) => (n >= 1000 ? `$${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `$${n}`);
const pct = (n: number | null) => (n == null ? "–" : `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`);
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const bucketLabel = (date: string, group: ReportGroup) => {
  const d = new Date(`${date}T00:00:00Z`);
  return group === "month" ? monthName.format(d) : group === "week" ? `Week of ${shortDay.format(d)}` : shortDay.format(d);
};

export function ProfitTab({ range, versus, group, onGroup }: { range: ReportRange; versus: string; group: ReportGroup; onGroup: (group: ReportGroup) => void }) {
  const { dict } = useT();
  const t = dict.profitReport;
  const query = useReport("profit", range, group);
  const groupWord = t[group];

  // Before the backend with the profit report is deployed the route is a 404: say so instead of an error page.
  if (query.isError && ApiError.from(query.error).status === 404) {
    return (
      <Panel id="profit-not-yet" title={t.tab} icon={PiggyBank} tone="sea">
        <Empty>{t.missing}</Empty>
      </Panel>
    );
  }

  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const now = r.totals;
        const c = r.comparison;
        const labels = r.series.map((p) => bucketLabel(p.date, group));
        const profitPoints: Point[] = r.series.map((p, i) => ({
          label: labels[i],
          value: Number(p.gross_profit_usd),
          tooltip: `${formatUsd(p.sales_usd)} sales − ${formatUsd(p.cost_of_goods_usd)} cost`,
        }));
        const spendPoints: Point[] = r.series.map((p, i) => ({ label: labels[i], value: Number(p.restock_spend_usd) }));
        const hasProfit = profitPoints.some((p) => p.value !== 0);
        const hasSpend = spendPoints.some((p) => p.value !== 0);

        return (
          <>
            {now.units_sold_cost_unknown > 0 ? (
              <p role="note" className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-tint px-4 py-3 text-[15px] text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {t.unknownWarning.replace("{amount}", formatUsd(now.sales_cost_unknown_usd)).replace("{n}", count(now.units_sold_cost_unknown))}{" "}
                  <a href="#profit-unknown" className="font-semibold underline underline-offset-4">{t.unknown}</a>
                </span>
              </p>
            ) : null}

            <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                id="p-spend"
                label={t.spend}
                icon={PackagePlus}
                tone="coral"
                value={<AnimatedNumber value={Number(now.restock_spend_usd)} format={money} />}
                khr={now.restock_spend_khr}
                detail={[t.spendDetail.replace("{n}", count(now.restock_units)), now.restock_units_without_cost ? t.spendNoCost.replace("{n}", count(now.restock_units_without_cost)) : ""].filter(Boolean).join(" · ")}
                change={<Change percent={c.change_percent.restock_spend} previous={Number(c.totals.restock_spend_usd)} versus={versus} moreIsBetter={false} />}
                trend={spendPoints.map((p) => p.value)}
                labels={labels}
                format={money}
              />
              <Kpi
                id="p-sales"
                label={t.sales}
                icon={ShoppingBag}
                tone="saffron"
                value={<AnimatedNumber value={Number(now.sales_usd)} format={money} />}
                khr={now.sales_khr}
                detail={t.salesDetail.replace("{n}", count(now.units_sold_costed))}
                change={<Change percent={c.change_percent.sales} previous={Number(c.totals.sales_usd)} versus={versus} />}
                trend={r.series.map((p) => Number(p.sales_usd))}
                labels={labels}
                format={money}
              />
              <Kpi
                id="p-cost"
                label={t.cost}
                icon={Receipt}
                tone="sky"
                value={<AnimatedNumber value={Number(now.cost_of_goods_usd)} format={money} />}
                khr={now.cost_of_goods_khr}
                detail={t.costDetail}
                change={<Change percent={c.change_percent.cost_of_goods} previous={Number(c.totals.cost_of_goods_usd)} versus={versus} moreIsBetter={false} />}
                trend={r.series.map((p) => Number(p.cost_of_goods_usd))}
                labels={labels}
                format={money}
              />
              <Kpi
                id="p-profit"
                label={t.profit}
                icon={PiggyBank}
                tone="sea"
                value={<AnimatedNumber value={Number(now.gross_profit_usd)} format={money} />}
                khr={now.gross_profit_khr}
                detail={now.margin_percent == null ? t.noMargin : t.margin.replace("{p}", pct(now.margin_percent))}
                change={<Change percent={c.change_percent.gross_profit} previous={Number(c.totals.gross_profit_usd)} versus={versus} />}
                trend={profitPoints.map((p) => p.value)}
                labels={labels}
                format={money}
              />
            </div>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t.lead}
            </p>

            <div className="dash-sales-grid grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Panel id="profit-trend" title={t.profitChart.replace("{group}", groupWord)} icon={LineChart} tone="sea" action={<GroupPicker value={group} onChange={onGroup} labels={{ day: cap(t.day), week: cap(t.week), month: cap(t.month) }} />}>
                {hasProfit ? <TrendChart points={profitPoints} label={t.profitChart.replace("{group}", groupWord)} format={money} axisFormat={usdAxis} color="var(--tone-fill)" /> : <Empty>{t.emptySales}</Empty>}
                <DataTable caption={t.profitChart.replace("{group}", groupWord)} head={[t[group], t.profit]} rows={profitPoints.map((p) => [p.label, money(p.value)])} />
              </Panel>
              <Kpi
                id="p-after-refunds"
                label={t.afterRefunds}
                icon={Undo2}
                tone="coral"
                value={<AnimatedNumber value={Number(now.profit_after_refunds_usd)} format={money} />}
                khr={now.profit_after_refunds_khr}
                detail={t.afterRefundsDetail.replace("{refunds}", formatUsd(now.refunds_usd)).replace("{cost}", formatUsd(now.returned_cost_usd))}
                change={<Change percent={c.change_percent.profit_after_refunds} previous={Number(c.totals.profit_after_refunds_usd)} versus={versus} />}
                view={{ to: "/admin/reports?tab=coupons", label: "View refunds" }}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel id="profit-spend" title={t.spendChart.replace("{group}", groupWord)} icon={PackagePlus} tone="coral">
                {hasSpend ? <ColumnChart points={spendPoints} label={t.spendChart.replace("{group}", groupWord)} format={money} color="var(--tone-fill)" /> : <Empty>{t.emptySpend}</Empty>}
                <DataTable caption={t.spendChart.replace("{group}", groupWord)} head={[t[group], t.spent]} rows={spendPoints.map((p) => [p.label, money(p.value)])} />
              </Panel>
              <Panel id="profit-suppliers" title={t.suppliers} icon={Truck} tone="saffron">
                {r.by_supplier.length === 0 ? (
                  <Empty>{t.emptySpend}</Empty>
                ) : (
                  <RankTable
                    head={[t.supplier, t.copies, t.spent]}
                    rows={r.by_supplier.map((s, i) => ({
                      key: s.supplier ?? `none-${i}`,
                      copies: s.units,
                      bar: Number(s.spend_usd),
                      sales: formatUsd(s.spend_usd),
                      khr: s.spend_khr,
                      name: (
                        <>
                          <span className={s.supplier ? "font-semibold" : "font-semibold italic text-muted-foreground"}>{s.supplier ?? t.noSupplier}</span>{s.type ? <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{s.type === "publisher" ? dict.suppliers.typePublisher : dict.suppliers.typeDistributor}</span> : null}
                          <span className="block text-sm text-muted-foreground tabular-nums">
                            {[`${count(s.restocks)} ${t.restocks.toLowerCase()}`, s.average_unit_cost_usd ? `${t.averageCost} ${formatUsd(s.average_unit_cost_usd)}` : "", s.units_without_cost ? t.withoutCost.replace("{n}", count(s.units_without_cost)) : ""].filter(Boolean).join(" · ")}
                          </span>
                        </>
                      ),
                    }))}
                  />
                )}
              </Panel>
            </div>

            <div className="dash-catalogue-grid grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel id="profit-books" title={t.books} icon={Trophy} tone="sea">
                {r.top_books.length === 0 ? (
                  <Empty>{t.emptySales}</Empty>
                ) : (
                  <RankTable
                    head={[t.book, t.copies, t.profitCol]}
                    rows={r.top_books.map((b) => ({
                      key: b.variant_id,
                      copies: b.units_sold,
                      bar: Math.max(0, Number(b.gross_profit_usd)),
                      sales: formatUsd(b.gross_profit_usd),
                      name: (
                        <>
                          <Link to={`/admin/books/${b.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">{b.title}</Link>
                          <span className="block text-sm text-muted-foreground tabular-nums">
                            {formatLabel(b.format)} · {t.marginCol} {pct(b.margin_percent)} · {t.salesCol} {formatUsd(b.sales_usd)}
                          </span>
                        </>
                      ),
                    }))}
                  />
                )}
              </Panel>
              <Panel id="profit-categories" title={t.categories} icon={FolderTree} tone="sky">
                {r.by_category.length === 0 ? (
                  <Empty>{t.emptySales}</Empty>
                ) : (
                  <RankTable
                    head={[t.category, t.copies, t.profitCol]}
                    rows={r.by_category.map((cat) => ({
                      key: cat.category_id,
                      copies: cat.units_sold,
                      bar: Math.max(0, Number(cat.gross_profit_usd)),
                      sales: formatUsd(cat.gross_profit_usd),
                      name: (
                        <>
                          <span className="font-semibold">{cat.name}</span>
                          <span className="block text-sm text-muted-foreground tabular-nums">
                            {t.marginCol} {pct(cat.margin_percent)} · {t.salesCol} {formatUsd(cat.sales_usd)}
                          </span>
                        </>
                      ),
                    }))}
                  />
                )}
              </Panel>
            </div>

            <Panel id="profit-unknown" title={t.unknown} icon={AlertTriangle} tone="amber" action={<Link to="/admin/stock" className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">{dict.adminHome.allStock} <ArrowRight className="admin-arrow size-4" aria-hidden="true" /></Link>}>
              {r.cost_unknown.length === 0 ? (
                <Empty>{t.unknownAll}</Empty>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{t.unknownNote}</p>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {r.cost_unknown.map((b) => (
                      <li key={b.variant_id} className="min-w-0">
                        <Link to={`/admin/books/${b.book_id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-[15px] outline-none transition-colors hover:bg-[var(--tone-tint)] focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{b.title}</span>
                            <span className="block text-sm text-muted-foreground">{formatLabel(b.format)}</span>
                          </span>
                          <span className="shrink-0 text-right text-sm tabular-nums">
                            <span className="block font-semibold">{formatUsd(b.sales_usd)}</span>
                            <span className="block text-muted-foreground">{t.sold} {count(b.units_sold)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </>
        );
      }}
    </State>
  );
}
