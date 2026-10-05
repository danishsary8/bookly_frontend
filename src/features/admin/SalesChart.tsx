import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DailySales } from "@/api/endpoints/staff";
import { formatUsd } from "@/stores/currency";

/*
 * Daily net revenue as columns (dataviz skill: one series, so no legend; the
 * heading names it). Columns ≤ 24px with a 4px rounded top on one baseline,
 * hairline grid, clean y ticks, the peak labelled. Hover or arrow keys move one
 * tooltip; every value is also in the table below. Colours are theme tokens, so
 * dark mode uses its own lapis step.
 */

const HEIGHT = 240;
const PAD = { top: 24, right: 8, bottom: 28, left: 52 };
const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
const parse = (date: string) => new Date(`${date}T00:00:00Z`);

/** 0 and up to 4 more round steps covering `max` (1, 2, 2.5 or 5 × 10ⁿ). */
function ticks(max: number) {
  if (max <= 0) return [0, 10, 20];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

const compactUsd = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`);

export function SalesChart({ days }: { days: DailySales[] }) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const values = useMemo(() => days.map((d) => Number(d.net_revenue_usd) || 0), [days]);
  const yTicks = ticks(Math.max(...values, 0));
  const yMax = yTicks[yTicks.length - 1];
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / Math.max(days.length, 1);
  const barW = Math.max(3, Math.min(24, band - 2));
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const peak = values.indexOf(Math.max(...values));
  const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(plotW / 64)));

  const move = (event: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : days.length - 1);
    } else if (keys[event.key] !== undefined) {
      event.preventDefault();
      setActive((i) => Math.min(days.length - 1, Math.max(0, (i ?? (keys[event.key] > 0 ? -1 : days.length)) + keys[event.key])));
    }
  };

  const tip = active !== null ? days[active] : null;
  const tipX = active !== null ? PAD.left + band * active + band / 2 : 0;

  return (
    <div className="grid gap-3">
      <div ref={wrap} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="group"
          aria-label="Net revenue by day. Use the left and right arrow keys to read each day."
          aria-describedby={`${id}-table`}
          tabIndex={0}
          onKeyDown={move}
          onFocus={() => setActive((i) => i ?? days.length - 1)}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          className="block max-w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[12px] tabular-nums">
                {compactUsd(t)}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const v = values[i];
            const x = PAD.left + band * i + (band - barW) / 2;
            const top = y(v);
            const h = PAD.top + plotH - top;
            const r = Math.min(4, barW / 2, h);
            const path = h <= 0 ? "" : `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`;
            return (
              <g key={d.date} onPointerEnter={() => setActive(i)}>
                {/* Hit target: the whole band, taller than the mark. */}
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="transparent" />
                {path ? <path d={path} className={active === null || active === i ? "fill-primary" : "fill-primary/45"} /> : null}
                {i % labelEvery === 0 || i === days.length - 1 ? (
                  <text
                    x={i === days.length - 1 ? Math.min(PAD.left + band * i + band / 2 + 12, width - PAD.right) : PAD.left + band * i + band / 2}
                    y={HEIGHT - 8}
                    textAnchor={i === days.length - 1 ? "end" : "middle"}
                    className="fill-muted-foreground text-[12px]"
                  >
                    {dayLabel.format(parse(d.date))}
                  </text>
                ) : null}
              </g>
            );
          })}
          {values[peak] > 0 && active === null ? (
            <text x={PAD.left + band * peak + band / 2} y={y(values[peak]) - 8} textAnchor="middle" className="fill-foreground text-[12px] font-semibold tabular-nums">
              {formatUsd(values[peak])}
            </text>
          ) : null}
          <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} className="stroke-input" strokeWidth={1} />
        </svg>
        {tip ? (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 grid w-64 gap-0.5 rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-overlay"
            style={{ left: Math.min(Math.max(tipX - 128, 0), width - 256) }}
          >
            <span className="text-base font-semibold tabular-nums">{formatUsd(tip.net_revenue_usd)}</span>
            <span className="text-muted-foreground">{dayLong.format(parse(tip.date))}: from orders delivered that day</span>
            <span className="text-muted-foreground tabular-nums">
              {tip.orders_placed} new {tip.orders_placed === 1 ? "order" : "orders"} placed
              {Number(tip.refunds_usd) > 0 ? ` · ${formatUsd(tip.refunds_usd)} refunded` : ""}
            </span>
          </div>
        ) : null}
      </div>
      <details className="group text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">Show as a table</summary>
        <div className="relative mt-2 max-h-72 overflow-auto rounded-md border border-border">
          <table id={`${id}-table`} className="w-full text-left tabular-nums">
            <caption className="sr-only">Net revenue, gross revenue, refunds and orders placed per day</caption>
            <thead className="sticky top-0 bg-surface-2 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Day</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Net</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Gross</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Refunds</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {days.map((d) => (
                <tr key={d.date}>
                  <th scope="row" className="px-3 py-2 font-normal">{dayLong.format(parse(d.date))}</th>
                  <td className="px-3 py-2 text-right font-semibold">{formatUsd(d.net_revenue_usd)}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(d.gross_revenue_usd)}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(d.refunds_usd)}</td>
                  <td className="px-3 py-2 text-right">{d.orders_placed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
