import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { isGoalProgress, shopSettingsQueries } from "@/api/endpoints/shopSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/features/admin/dashboard/AnimatedNumber";
import { Khr, Panel } from "@/features/admin/reportKit";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";

const money = (n: number) => formatUsd(n.toFixed(2));
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Dashboard → this month's net revenue against the monthly goal (Phase 4): a progress bar with a marker where the
 * shop should be by today, "On track" / "Behind", and what is needed per day for the rest of the month. Always this
 * calendar month, whatever period the dashboard shows. Hidden on an API without the goal route.
 */
export function GoalCard() {
  const { dict } = useT();
  const t = dict.goalCard;
  const query = useQuery(shopSettingsQueries.goal());
  if (query.isError || (query.data !== undefined && !isGoalProgress(query.data))) return null;
  const g = query.data;
  const month = g ? monthName.format(new Date(`${g.month}-01T00:00:00Z`)) : "";
  const net = g ? Number(g.net_revenue_usd) : 0;
  const goal = g?.goal_usd ? Number(g.goal_usd) : null;
  const fill = goal ? Math.min(100, (net / goal) * 100) : 0;
  const marker = g && goal ? (g.days_passed / g.days_in_month) * 100 : 0;
  const reached = goal !== null && net >= goal;

  return (
    <Panel
      id="dash-goal"
      title={`${t.title}${month ? ` · ${month}` : ""}`}
      icon={Target}
      tone="sea"
      action={
        <Link to="/admin/settings" className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          {goal ? t.edit : t.set} <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
        </Link>
      }
    >
      {!g ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : goal === null ? (
        <p className="text-[15px] text-muted-foreground">{t.noGoal}</p>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[2rem] font-semibold leading-none tracking-[-0.03em] tabular-nums"><AnimatedNumber countUp value={net} format={money} /></p>
              <Khr value={g.net_revenue_khr} />
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">{t.of.replace("{goal}", formatUsd(g.goal_usd!))} · {g.percent ?? 0}%</p>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold", reached || g.on_track ? "bg-success-tint text-success" : "bg-warning-tint text-warning")}>
              {reached ? <CheckCircle2 className="size-4" aria-hidden="true" /> : g.on_track ? <TrendingUp className="size-4" aria-hidden="true" /> : <TrendingDown className="size-4" aria-hidden="true" />}
              {reached ? t.reached : g.on_track ? t.onTrack : t.behind}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fill)}
            aria-valuetext={`${formatUsd(g.net_revenue_usd)} ${t.of.replace("{goal}", formatUsd(g.goal_usd!))}`}
            className="relative h-3 rounded-full bg-surface-2"
          >
            <span className="admin-bar absolute inset-y-0 left-0 rounded-full" style={{ width: `${fill}%`, background: "var(--tone-fill)" }} />
            <span aria-hidden="true" title={t.expected.replace("{v}", formatUsd(g.expected_by_today_usd ?? "0"))} className="absolute -top-1 h-5 w-0.5 rounded-full bg-foreground/70" style={{ left: `calc(${marker}% - 1px)` }} />
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
            <span>{t.day.replace("{n}", String(g.days_passed)).replace("{total}", String(g.days_in_month))} · {t.expected.replace("{v}", formatUsd(g.expected_by_today_usd ?? "0"))}</span>
            {!reached && g.needed_per_day_usd ? <span>{t.perDay.replace("{v}", formatUsd(g.needed_per_day_usd))}</span> : null}
          </div>
        </div>
      )}
    </Panel>
  );
}
