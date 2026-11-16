import { m, useReducedMotion } from "motion/react";
import { bucketCounts, chartTransition } from "./chartMotion";
import { useChartInspection } from "./ChartInspection";

/** Real daily totals, grouped into at most 30 labelled intervals; missing data is never zero. */
export function DailyBars({ points, name }: { points: Array<{ label: string; value: number | undefined }>; name: string }) {
  const bars = bucketCounts(points);
  const reduce = useReducedMotion();
  const { ref: chartRef, active, show, leave, tooltip } = useChartInspection(bars.map((bar) => ({ label: bar.label, value: bar.value === undefined ? "Unavailable" : `${bar.value.toLocaleString("en-US")} ${bar.value === 1 ? "copy" : "copies"}`, detail: name })), true);
  if (!bars.length || bars.every((bar) => bar.value === undefined)) return null;
  const max = Math.max(1, ...bars.map((bar) => bar.value ?? 0));
  return (
    <>
      <div ref={chartRef} role="img" aria-label={`${name} daily totals, ${bars.length} intervals. Focus the card and use arrows to inspect exact values.`}
        className="dash-daily-bars" onPointerLeave={(event) => { if (event.pointerType !== "touch") leave(); }}>
        {bars.map((bar, index) => (
          <m.div key={index} layout={reduce ? false : "position"} transition={reduce ? { duration: 0 } : chartTransition} className="dash-daily-bar-hit"
            data-active={active === index || undefined} onPointerMove={(event) => show(index, event.currentTarget)} onPointerDown={(event) => show(index, event.currentTarget)}
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); show(index, event.currentTarget); }}>
            <m.span aria-hidden="true" initial={reduce ? false : { height: "0%" }} animate={{ height: `${(bar.value ?? 0) / max * 100}%` }} transition={reduce ? { duration: 0 } : chartTransition}
              className="dash-daily-bar" style={{ opacity: 0.45 + 0.55 * (index + 1) / bars.length }} />
          </m.div>
        ))}
      </div>
      {tooltip}
    </>
  );
}

export type ShareDatum = { label: string; value: number; color: string };

/** Labelled horizontal bars replace prose counts; exact counts/shares appear by pointer or card focus. */
export function ShareBars({ rows, name }: { rows: ShareDatum[]; name: string }) {
  const reduce = useReducedMotion();
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.value), 0);
  const max = Math.max(1, ...rows.map((row) => row.value));
  const { ref: chartRef, active, show, leave, tooltip } = useChartInspection(rows.map((row) => ({ label: row.label, value: row.value.toLocaleString("en-US"), detail: total ? `${(row.value / total * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}% of ${total.toLocaleString("en-US")} ${name.toLowerCase()}` : "No data in this period" })), true);
  return (
    <>
      <div ref={chartRef} role="img" aria-label={`${name}: ${rows.map((row) => `${row.label} ${row.value}`).join(", ")}. Focus the card and use arrows to inspect.`}
        className="dash-share-bars" onPointerLeave={(event) => { if (event.pointerType !== "touch") leave(); }}>
        {rows.map((row, index) => (
          <div key={row.label} className="dash-share-row" data-active={active === index || undefined}
            onPointerMove={(event) => show(index, event.currentTarget)} onPointerDown={(event) => show(index, event.currentTarget)}
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); show(index, event.currentTarget); }}>
            <span className="dash-share-label">{row.label}</span>
            <span className="dash-share-track" aria-hidden="true"><m.span initial={false} animate={{ width: `${Math.max(0, row.value) / max * 100}%` }} transition={reduce ? { duration: 0 } : chartTransition} style={{ background: row.color }} /></span>
          </div>
        ))}
      </div>
      {tooltip}
    </>
  );
}
