import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Trophy } from "lucide-react";
import { isBookSales, shopSettingsQueries } from "@/api/endpoints/shopSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/features/admin/reportKit";
import { useT } from "@/i18n";
import { formatLabel } from "@/lib/catalog";
import { formatUsd } from "@/stores/currency";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Phnom_Penh" });

/** Book details → how this book sells: 30/90-day copies, 90-day sales, best-seller rank and copies per format. */
export function BookSalesPanel({ bookId }: { bookId: number }) {
  const { dict } = useT();
  const t = dict.bookSales;
  const query = useQuery(shopSettingsQueries.bookSales(bookId));
  if (query.isError || (query.data !== undefined && !isBookSales(query.data))) return null;
  const s = query.data;

  return (
    <Panel id="book-sales" title={t.title} icon={TrendingUp} tone="sea">
      {!s ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : (
        <div className="grid gap-3">
          <p className={s.rank_90_days ? "inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--tone-tint)] px-3 py-1 text-sm font-bold text-[var(--tone-ink)]" : "text-sm text-muted-foreground"}>
            {s.rank_90_days ? <Trophy className="size-4" aria-hidden="true" /> : null}
            {s.rank_90_days ? t.rank.replace("{n}", String(s.rank_90_days)).replace("{total}", String(s.books_ranked)) : t.notRanked}
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {([[t.sold30, String(s.sold_30_days)], [t.sold90, String(s.sold_90_days)], [t.sales90, formatUsd(s.sales_90_days_usd)]] as const).map(([label, value]) => (
              <div key={label} className="grid gap-0.5 rounded-xl border border-border px-2 py-2.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {s.by_format.length > 1 ? (
            <div className="grid gap-1 text-sm">
              <p className="font-semibold text-muted-foreground">{t.byFormat}</p>
              <ul className="flex flex-wrap gap-2">
                {s.by_format.map((f) => <li key={f.variant_id} className="rounded-full bg-surface-2 px-2.5 py-1 tabular-nums">{formatLabel(f.format)} · {f.units_sold}</li>)}
              </ul>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground tabular-nums">
            {t.allTime.replace("{n}", s.sold_all_time.toLocaleString("en-US"))} · {s.last_sold_at ? t.last.replace("{date}", dateFmt.format(new Date(s.last_sold_at))) : t.never}
          </p>
        </div>
      )}
    </Panel>
  );
}
