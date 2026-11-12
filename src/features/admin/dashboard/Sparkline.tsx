import { useId, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

/*
 * A small trend line for a KPI card (dataviz: no axes, one series, the last point marked). Pointing at it shows the
 * day and its value in a small tooltip with a guide line. Decorative for screen readers: the card's number and its
 * "vs previous period" text say the same in words, and the reports have the full tables.
 */
export function Sparkline({
  values,
  className,
  color = "var(--primary)",
  fill = 0.18,
  labels,
  format = (n) => String(n),
  onDark = false,
}: {
  values: number[];
  className?: string;
  color?: string;
  fill?: number;
  labels?: string[];
  format?: (n: number) => string;
  onDark?: boolean;
}) {
  const gradient = `spark-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<number | null>(null);
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
  const point = hover ?? last;
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setHover(Math.round(ratio * last));
  };
  const left = (point / last) * 100;

  return (
    <div aria-hidden="true" className={cn("admin-spark relative h-8 w-full touch-none", className)} onPointerMove={move} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="size-full overflow-visible" data-testid="sparkline">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fill} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gradient})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null ? <line x1={x(point)} x2={x(point)} y1={0} y2={h} stroke={color} strokeOpacity={0.35} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {/* The dot is HTML so it stays round whatever the card's width. */}
      <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 transition-[left,top] duration-100 ease-out" style={{ left: `${left}%`, top: `${(y(values[point]) / h) * 100}%`, background: color, ["--tw-ring-color" as string]: onDark ? "#2A2F9E" : "var(--card)" }} />
      {hover !== null ? (
        <span
          className={cn("pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums shadow-overlay", onDark ? "bg-white text-[#14207A]" : "border border-border bg-popover text-foreground")}
          style={{ left: `clamp(2.5rem, ${left}%, calc(100% - 2.5rem))` }}
        >
          {labels?.[point] ? <span className="mr-1.5 font-normal text-muted-foreground">{labels[point]}</span> : null}
          {format(values[point])}
        </span>
      ) : null}
    </div>
  );
}
