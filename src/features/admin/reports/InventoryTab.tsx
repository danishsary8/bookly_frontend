import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Boxes, CircleHelp, ClipboardList, FolderTree, Hourglass, PackageCheck, PiggyBank, Snail, Tags, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { inventoryQuery, type InventoryDays } from "@/api/endpoints/reports";
import { AnimatedNumber } from "@/features/admin/dashboard/AnimatedNumber";
import { Kpi, RankTable } from "@/features/admin/dashboard/DashKit";
import { Panel } from "@/features/admin/reportKit";
import { Segmented } from "@/features/admin/listKit";
import { Empty, State } from "@/features/admin/reports/reportParts";
import { useT } from "@/i18n";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";

/*
 * Reports → Inventory (owner 2026-11-16, Phase 2): today's stock health. What the shelves are worth (at cost and at
 * selling price), which books run out soon at the recent sales speed with a suggested amount to buy, and which have
 * not sold for 90 days. The page's time period does not apply; the sales-speed window is chosen here.
 */

const money = (n: number) => formatUsd(n.toFixed(2));
const count = (n: number) => Math.round(n).toLocaleString("en-US");
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Phnom_Penh" });
const SPEEDS: InventoryDays[] = [7, 14, 30, 60, 90];

export function InventoryTab() {
  const { dict } = useT();
  const t = dict.inventoryReport;
  const [days, setDays] = useState<InventoryDays>(30);
  const query = useQuery(inventoryQuery(days));

  if (query.isError && ApiError.from(query.error).status === 404) {
    return (
      <Panel id="inventory-not-yet" title={t.tab} icon={Boxes} tone="sky">
        <Empty>{t.missing}</Empty>
      </Panel>
    );
  }

  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const s = r.totals;
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex max-w-[70ch] items-start gap-2 text-sm text-muted-foreground">
                <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t.lead}
              </p>
              <div className="inventory-speed flex min-w-0 max-w-full flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">{t.speed}</span>
                <Segmented label={t.speed} value={String(days)} options={SPEEDS.map((d) => ({ value: String(d), label: t.days.replace("{n}", String(d)) }))} onChange={(v) => setDays(Number(v) as InventoryDays)} />
              </div>
            </div>

            <ul className="flex flex-wrap gap-2" aria-label={t.tab}>
              <StatusChip tone="warning" icon={AlertTriangle} label={t.lowStock} value={s.low_stock} />
              <StatusChip tone="danger" icon={Boxes} label={t.outOfStock} value={s.out_of_stock} />
              <StatusChip tone="warning" icon={Timer} label={t.soon} value={s.runs_out_soon} />
              <StatusChip tone="muted" icon={Snail} label={t.dead} value={s.dead_formats} />
            </ul>

            <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi id="i-cost" label={t.cost} icon={PackageCheck} tone="sky" value={<AnimatedNumber value={Number(s.value_cost_usd)} format={money} />} khr={s.value_cost_khr}
                detail={[t.costDetail.replace("{n}", count(s.copies)), s.copies_without_cost ? t.costMissing.replace("{n}", count(s.copies_without_cost)) : ""].filter(Boolean).join(" · ")} />
              <Kpi id="i-retail" label={t.retail} icon={Tags} tone="saffron" value={<AnimatedNumber value={Number(s.value_retail_usd)} format={money} />} khr={s.value_retail_khr} detail={t.retailDetail.replace("{n}", count(s.formats_in_stock))} />
              <Kpi id="i-potential" label={t.potential} icon={PiggyBank} tone="sea" value={<AnimatedNumber value={Number(s.potential_profit_usd)} format={money} />} khr={s.potential_profit_khr} detail={t.potentialDetail} />
              <Kpi id="i-dead" label={t.dead} icon={Snail} tone="coral" value={<AnimatedNumber value={Number(s.dead_value_usd)} format={money} />} khr={s.dead_value_khr}
                detail={t.deadDetail.replace("{copies}", count(s.dead_copies)).replace("{formats}", count(s.dead_formats)).replace("{days}", String(r.dead_days))} />
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
              <Panel id="inventory-runs-out" title={t.runsOut} icon={Hourglass} tone="coral"
                action={<Link to="/admin/purchases" className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"><ClipboardList className="size-4" aria-hidden="true" />{t.purchaseList} <ArrowRight className="admin-arrow size-4" aria-hidden="true" /></Link>}>
                <p className="text-sm text-muted-foreground">{t.runsOutNote.replace("{n}", String(r.sales_days)).replace("{cover}", String(r.cover_days))}</p>
                {r.runs_out.length === 0 ? (
                  <Empty>{t.runsOutEmpty}</Empty>
                ) : (
                  <ul className="grid grid-cols-1 gap-2">
                    {r.runs_out.map((v) => (
                      <li key={v.book_variant_id} className="min-w-0">
                        <Link to={`/admin/books/${v.book_id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[15px] outline-none transition-colors hover:bg-[var(--tone-tint)] focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{v.title}</span>
                            <span className="block text-sm text-muted-foreground tabular-nums">
                              {formatLabel(v.format)} · {v.stock_quantity} in stock · {t.soldIn.replace("{n}", count(v.sold))} ({t.perDay.replace("{n}", String(v.per_day))})
                            </span>
                          </span>
                          <span className="grid justify-items-end gap-1">
                            <DaysPill days={v.days_left} label={v.stock_quantity <= 0 ? t.outNow : t.daysLeft.replace("{n}", String(v.days_left))} />
                            {v.suggested_buy > 0 ? <span className="text-sm font-semibold tabular-nums text-[var(--tone-ink)]">{t.buy.replace("{n}", count(v.suggested_buy))}</span> : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel id="inventory-not-selling" title={t.notSelling.replace("{n}", String(r.dead_days))} icon={Snail} tone="slate">
                <p className="text-sm text-muted-foreground">{t.notSellingNote}</p>
                {r.not_selling.length === 0 ? (
                  <Empty>{t.notSellingEmpty.replace("{n}", String(r.dead_days))}</Empty>
                ) : (
                  <ul className="grid grid-cols-1 gap-2">
                    {r.not_selling.map((v) => (
                      <li key={v.book_variant_id} className="min-w-0">
                        <Link to={`/admin/books/${v.book_id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[15px] outline-none transition-colors hover:bg-[var(--tone-tint)] focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{v.title}</span>
                            <span className="block text-sm text-muted-foreground tabular-nums">
                              {formatLabel(v.format)} · {v.stock_quantity} in stock · {v.last_sold_at ? t.lastSold.replace("{date}", dateFmt.format(new Date(v.last_sold_at))) : t.neverSold}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums">{formatUsd(v.value_usd)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel id="inventory-categories" title={t.byCategory} icon={FolderTree} tone="sky">
              {r.by_category.length === 0 ? (
                <Empty>{t.runsOutEmpty}</Empty>
              ) : (
                <RankTable
                  head={[t.category, t.copies, t.value]}
                  rows={r.by_category.map((c) => ({
                    key: c.category_id,
                    copies: c.copies,
                    bar: Number(c.value_retail_usd),
                    sales: formatUsd(c.value_retail_usd),
                    name: (
                      <>
                        <span className="font-semibold">{c.name}</span>
                        <span className="block text-sm text-muted-foreground tabular-nums">{t.atCost.replace("{v}", formatUsd(c.value_cost_usd))}</span>
                      </>
                    ),
                  }))}
                />
              )}
            </Panel>
          </>
        );
      }}
    </State>
  );
}

/** A count chip for the stock status strip; zero shows calm. */
function StatusChip({ tone, icon: Icon, label, value }: { tone: "warning" | "danger" | "muted"; icon: typeof Boxes; label: string; value: number }) {
  const calm = value === 0;
  return (
    <li className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold tabular-nums",
      calm ? "border-border bg-card text-muted-foreground" : tone === "danger" ? "border-destructive/30 bg-destructive-tint text-destructive" : tone === "warning" ? "border-warning/30 bg-warning-tint text-warning" : "border-border bg-surface-2 text-foreground")}>
      <Icon className="size-4" aria-hidden="true" />
      {label}
      <span className="rounded-full bg-card/70 px-2 py-0.5">{count(value)}</span>
    </li>
  );
}

/** Red for a week or less, amber up to two weeks, calm beyond. */
export function DaysPill({ days, label }: { days: number | null; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
      days === null ? "bg-secondary text-muted-foreground" : days <= 7 ? "bg-destructive-tint text-destructive" : days <= 14 ? "bg-warning-tint text-warning" : "bg-success-tint text-success")}>
      <Timer className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
