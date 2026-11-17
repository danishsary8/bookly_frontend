import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CircleHelp, FolderTree, LineChart, PackagePlus, Percent, PiggyBank, Receipt, ShoppingBag, Trophy, Truck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
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
/** Percent change from `before` to `now`, like the API's change_percent (undefined when both are 0). */
const changeOf = (now: number, before: number) => (before === 0 ? (now === 0 ? 0 : 100) : Math.round(((now - before) / Math.abs(before)) * 1000) / 10);
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
  // The Sales tab's money for the same days (shared cache): net book sales = net revenue − delivery fees.
  const sales = useReport("sales", range, group);
  const { search } = useLocation();
  const salesParams = new URLSearchParams(search);
  salesParams.delete("tab");
  const salesLink = `/admin/reports${salesParams.size ? `?${salesParams.toString()}` : ""}`;
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
        // Returns counted inside sales and cost (owner 2026-11-17): one profit that the cards add up to.
        const refunds = Number(now.refunds_usd);
        const returnedCost = Number(now.returned_cost_usd);
        const netSales = Number(now.sales_usd) - refunds;
        const netSalesBefore = Number(c.totals.sales_usd) - Number(c.totals.refunds_usd);
        const netCost = Number(now.cost_of_goods_usd) - returnedCost;
        const netCostBefore = Number(c.totals.cost_of_goods_usd) - Number(c.totals.returned_cost_usd);
        // Net revenue − delivery fees (− sales without a cost, which profit leaves out) when it adds up to this card.
        const salesTotals = sales.data?.totals;
        const unknownSales = Number(now.sales_cost_unknown_usd);
        const fromRevenue = salesTotals && Math.abs(Number(salesTotals.net_revenue_usd) - Number(salesTotals.shipping_usd) - unknownSales - netSales) < 0.005
          ? (unknownSales > 0 ? t.netSalesFromRevenueUnknown : t.netSalesFromRevenue)
              .replace("{rev}", money(Number(salesTotals.net_revenue_usd)))
              .replace("{ship}", money(Number(salesTotals.shipping_usd)))
              .replace("{unknown}", money(unknownSales))
          : null;
        const marginOf = (profit: number, sales: number) => (sales > 0 ? Math.round((profit / sales) * 1000) / 10 : null);
        const margin = marginOf(Number(now.profit_after_refunds_usd), netSales);
        const marginBefore = marginOf(Number(c.totals.profit_after_refunds_usd), netSalesBefore);

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

            {/* Top row (owner 2026-11-17): an income statement in four cards that add up left to right. Returns are
                counted inside the cards: refunds come off sales, returned copies' cost comes off cost, so there is one
                profit. Restock spending is not part of profit and sits beside the chart. */}
            <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                id="p-sales"
                label={t.netSales}
                icon={ShoppingBag}
                tone="saffron"
                value={<AnimatedNumber value={netSales} format={money} />}
                detail={fromRevenue ?? (refunds > 0 ? t.netSalesDetail.replace("{sales}", money(Number(now.sales_usd))).replace("{v}", money(refunds)) : t.noRefunds)}
                view={{ to: salesLink, label: t.viewNetRevenue }}
                change={<Change percent={changeOf(netSales, netSalesBefore)} previous={netSalesBefore} versus={versus} />}
                trend={r.series.map((p) => Number(p.sales_usd))}
                labels={labels}
                format={money}
              />
              <Kpi
                id="p-cost"
                label={t.cost}
                icon={Receipt}
                tone="sky"
                value={<AnimatedNumber value={netCost} format={money} />}
                detail={returnedCost > 0 ? t.costNetDetail.replace("{cost}", money(Number(now.cost_of_goods_usd))).replace("{v}", money(returnedCost)) : t.costDetail}
                change={<Change percent={changeOf(netCost, netCostBefore)} previous={netCostBefore} versus={versus} moreIsBetter={null} />}
                trend={r.series.map((p) => Number(p.cost_of_goods_usd))}
                labels={labels}
                format={money}
              />
              <Kpi
                id="p-profit"
                label={t.profit}
                icon={PiggyBank}
                tone="sea"
                value={<AnimatedNumber value={Number(now.profit_after_refunds_usd)} format={money} />}
                khr={now.profit_after_refunds_khr}
                detail={t.profitDetail}
                change={<Change percent={c.change_percent.profit_after_refunds} previous={Number(c.totals.profit_after_refunds_usd)} versus={versus} />}
                trend={profitPoints.map((p) => p.value)}
                labels={labels}
                format={money}
              />
              <Kpi
                id="p-margin"
                label={t.marginTitle}
                icon={Percent}
                tone="coral"
                value={margin === null ? "–" : pct(margin)}
                detail={t.marginDetail}
                change={margin !== null && marginBefore !== null ? <MarginChange points={margin - marginBefore} versus={versus} /> : undefined}
              />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2">
                <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {t.lead}{" "}
                  <Link to="/admin/reports?tab=sales" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                    {t.salesLink}
                  </Link>
                </span>
              </p>
              {now.units_sold_cost_unknown === 0 && now.units_sold_costed > 0 ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                  {t.costTracked}
                </span>
              ) : null}
            </div>

            <div className="dash-sales-grid grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Panel id="profit-trend" title={t.profitChart.replace("{group}", groupWord)} icon={LineChart} tone="sea" action={<GroupPicker value={group} onChange={onGroup} labels={{ day: cap(t.day), week: cap(t.week), month: cap(t.month) }} />}>
                {hasProfit ? <TrendChart points={profitPoints} label={t.profitChart.replace("{group}", groupWord)} format={money} axisFormat={usdAxis} color="var(--tone-fill)" /> : <Empty>{t.emptySales}</Empty>}
                <DataTable caption={t.profitChart.replace("{group}", groupWord)} head={[t[group], t.profit]} rows={profitPoints.map((p) => [p.label, money(p.value)])} />
              </Panel>
              <Kpi
                id="p-spend"
                label={t.spend}
                icon={PackagePlus}
                tone="coral"
                value={<AnimatedNumber value={Number(now.restock_spend_usd)} format={money} />}
                khr={now.restock_spend_khr}
                detail={[t.spendDetail.replace("{n}", count(now.restock_units)), now.restock_units_without_cost ? t.spendNoCost.replace("{n}", count(now.restock_units_without_cost)) : "", t.spendNote].filter(Boolean).join(" · ")}
                change={<Change percent={c.change_percent.restock_spend} previous={Number(c.totals.restock_spend_usd)} versus={versus} moreIsBetter={null} />}
                trend={spendPoints.map((p) => p.value)}
                labels={labels}
                format={money}
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

/** Margin change in percentage points (a margin of 40% → 41% is +1 point, not +2.5%). */
function MarginChange({ points, versus }: { points: number; versus: string }) {
  const { dict } = useT();
  const rounded = Math.round(points * 10) / 10;
  if (rounded === 0) return <span className="text-sm text-muted-foreground">{dict.profitReport.marginSame} {versus}</span>;
  const up = rounded > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 text-sm tabular-nums">
      <span className={up ? "inline-flex items-center gap-0.5 rounded-full bg-success-tint px-2 py-0.5 font-semibold text-success" : "inline-flex items-center gap-0.5 rounded-full bg-destructive-tint px-2 py-0.5 font-semibold text-destructive"}>
        <Icon className="size-4" aria-hidden="true" />
        <span className="sr-only">{up ? "up" : "down"} </span>
        {dict.profitReport.points.replace("{v}", Math.abs(rounded).toLocaleString("en-US", { maximumFractionDigits: 1 }))}
      </span>{" "}
      <span className="text-muted-foreground">{versus}</span>
    </span>
  );
}
