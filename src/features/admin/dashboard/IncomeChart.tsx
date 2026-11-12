import { useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendDay } from "@/api/endpoints/dashboardInsights";
import { Segmented } from "@/features/admin/listKit";
import { formatUsd } from "@/stores/currency";

/*
 * Income (net revenue) or orders per day: this period as a solid line, the previous period of the same length dashed
 * (same day index), like the owner's sample. Two series, so a small legend; every value is also in the table below.
 */

const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const label = (date: string | null) => (date ? dayLabel.format(new Date(`${date}T00:00:00Z`)) : "");
const compactUsd = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);

type Metric = "income" | "orders";

export function IncomeChart({ days }: { days: TrendDay[] }) {
  const fillId = useId().replace(/:/g, "");
  const [metric, setMetric] = useState<Metric>("income");
  const [table, setTable] = useState(false);
  const isIncome = metric === "income";
  const fmt = (n: number) => (isIncome ? formatUsd(n.toFixed(2)) : String(n));
  const points = days.map((d) => ({
    label: label(d.date),
    previousLabel: label(d.previous_date),
    now: isIncome ? Number(d.net_revenue_usd) : d.orders_placed,
    before: isIncome ? Number(d.previous_net_revenue_usd) : d.previous_orders_placed,
  }));
  const total = (key: "now" | "before") => points.reduce((s, p) => s + p[key], 0);
  const name = isIncome ? "Net revenue" : "Orders placed";
  const summary = `${name} by day: this period ${fmt(total("now"))}, previous period ${fmt(total("before"))}.`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Show"
          value={metric}
          options={[
            { value: "income", label: "Income" },
            { value: "orders", label: "Orders" },
          ]}
          onChange={setMetric}
        />
        <ul className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="24" y2="4" stroke="var(--primary)" strokeWidth="2.5" />
            </svg>
            This period · <span className="font-semibold text-foreground tabular-nums">{fmt(total("now"))}</span>
          </li>
          <li className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="24" y2="4" stroke="var(--muted-foreground)" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Previous period · <span className="tabular-nums">{fmt(total("before"))}</span>
          </li>
        </ul>
      </div>
      <figure className="grid gap-2">
        <div role="img" aria-label={summary} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs><linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.16} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={52}
                allowDecimals={!isIncome ? false : true}
                tickFormatter={(n: number) => (isIncome ? compactUsd(n) : String(n))}
              />
              <Tooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm tabular-nums">
                      <p className="font-semibold">
                        {payload[0].payload.label}: {fmt(payload[0].payload.now)}
                      </p>
                      <p className="text-muted-foreground">
                        {payload[0].payload.previousLabel}: {fmt(payload[0].payload.before)}
                      </p>
                    </div>
                  ) : null
                }
              />
              <Line type="monotone" dataKey="before" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="now" fill={`url(#${fillId})`} stroke="var(--primary)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="sr-only">{summary}</figcaption>
      </figure>
      <button type="button" onClick={() => setTable((t) => !t)} aria-expanded={table} className="min-h-11 justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline">
        {table ? "Hide the table" : "Show as a table"}
      </button>
      {table ? (
        <div className="max-h-72 overflow-auto" tabIndex={0} role="region" aria-label={`${name} by day`}>
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">{name} by day, this period and the previous one</caption>
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="pb-2 font-normal">Day</th>
                <th scope="col" className="pb-2 pl-4 text-right font-normal">This period</th>
                <th scope="col" className="pb-2 pl-4 text-right font-normal">Previous day</th>
                <th scope="col" className="pb-2 pl-4 text-right font-normal">Previous period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {points.map((p) => (
                <tr key={p.label}>
                  <th scope="row" className="py-1.5 font-normal">{p.label}</th>
                  <td className="py-1.5 pl-4 text-right">{fmt(p.now)}</td>
                  <td className="py-1.5 pl-4 text-right text-muted-foreground">{p.previousLabel}</td>
                  <td className="py-1.5 pl-4 text-right">{fmt(p.before)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
