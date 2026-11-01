import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * A small trend line for a KPI card (dataviz: no axes, one series, the last point marked). Decorative: the card's
 * number and its "vs previous period" text say the same thing in words, so the SVG is hidden from screen readers.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const gradient = `spark-${useId().replace(/:/g, "")}`;
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 4);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className={cn("h-8 w-full overflow-visible", className)} data-testid="sparkline">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gradient})`} />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last])} r={2.5} fill="var(--primary)" />
    </svg>
  );
}
