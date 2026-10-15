import { useId, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/*
 * Report charts (dataviz rules, pages/admin.md §4): one series per chart in the theme's --primary (dark mode
 * has its own step), so no legend: the panel heading names it. Hairline grid, muted axis text, a 2px line or
 * thin bars with 4px rounded ends, one tooltip on hover or keyboard (Recharts' accessibility layer), and every
 * value again in a data table below the chart. Colours are CSS variables, never fixed hex.
 */

export type Point = { label: string; value: number; tooltip?: string };

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

function Tip({ active, payload, format }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }>; format: (n: number) => string }) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-overlay">
      <p className="text-muted-foreground">{point.label}</p>
      <p className="font-semibold tabular-nums text-foreground">{format(point.value)}</p>
      {point.tooltip ? <p className="text-muted-foreground tabular-nums">{point.tooltip}</p> : null}
    </div>
  );
}

/** Every value as a table, folded under the chart (screen readers, exact numbers, print). */
export function DataTable({ caption, head, rows }: { caption: string; head: [string, string]; rows: Array<[ReactNode, ReactNode]> }) {
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">Show as table</summary>
      <div className="max-h-72 overflow-auto" tabIndex={0} role="region" aria-label={caption}>
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1.5 font-normal">{head[0]}</th>
              <th scope="col" className="py-1.5 pl-4 text-right font-normal">{head[1]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(([a, b], i) => (
              <tr key={i}>
                <th scope="row" className="py-1.5 font-normal">{a}</th>
                <td className="py-1.5 pl-4 text-right">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** One measure over time as a soft area under a 2px line. */
export function TrendChart({ points, label, format, axisFormat = format }: { points: Point[]; label: string; format: (n: number) => string; axisFormat?: (n: number) => string }) {
  const gradient = `trend-${useId().replace(/:/g, "")}`;
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const peak = points.reduce<Point | null>((best, p) => (!best || p.value > best.value ? p : best), null);
  const summary = `${label}: ${points.length} points, total ${format(total)}${peak && peak.value > 0 ? `, highest ${format(peak.value)} on ${peak.label}` : ""}.`;
  return (
    <figure className="grid gap-2">
      <div role="img" aria-label={summary} className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={56} tickFormatter={axisFormat} allowDecimals={false} />
            <Tooltip content={(props) => <Tip {...props} format={format} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill={`url(#${gradient})`} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/** Ranked amounts as thin horizontal bars with the value at the end (best sellers, categories, funnel). */
export function BarList({ points, label, format }: { points: Point[]; label: string; format: (n: number) => string }) {
  const height = Math.max(120, points.length * 40 + 16);
  const summary = `${label}: ${points.map((p) => `${p.label} ${format(p.value)}`).join("; ")}.`;
  return (
    <div role="img" aria-label={summary} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={150} tick={axisTick} tickLine={false} axisLine={false} interval={0} />
          <Tooltip content={(props) => <Tip {...props} format={format} />} cursor={{ fill: "var(--secondary)" }} />
          <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => format(Number(v))} style={{ fill: "var(--foreground)", fontSize: 13, fontVariantNumeric: "tabular-nums" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Column per period (new customers). */
export function ColumnChart({ points, label, format }: { points: Point[]; label: string; format: (n: number) => string }) {
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const summary = `${label}: ${format(total)} over ${points.length} days.`;
  return (
    <div role="img" aria-label={summary} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip content={(props) => <Tip {...props} format={format} />} cursor={{ fill: "var(--secondary)" }} />
          <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
