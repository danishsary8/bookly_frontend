import { useId, useMemo, type PointerEvent } from "react";
import { m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { chartTransition, trendPath } from "./chartMotion";
import { useChartInspection } from "./ChartInspection";

export function Sparkline({ values, className, color = "var(--primary)", fill = 0.18, labels, format = String, name = "Daily trend" }: {
  values: number[]; className?: string; color?: string; fill?: number; labels?: string[]; format?: (value: number) => string; name?: string;
}) {
  const gradient = `spark-${useId().replace(/:/g, "")}`;
  const reduce = useReducedMotion();
  const shape = useMemo(() => trendPath(values), [values]);
  const { ref: chartRef, active, show, close, leave, keyDown, describedBy, tooltip } = useChartInspection(values.map((value, index) => ({ label: labels?.[index] ?? `Day ${index + 1}`, value: format(value), detail: name })));
  if (!values.length) return null;
  const last = values.length - 1;
  const point = active ?? last;
  const min = Math.min(0, ...values);
  const span = Math.max(0, ...values) - min || 1;
  const left = last ? point / last * 100 : 50;
  const top = (30 - (values[point] - min) / span * 28) / 32 * 100;
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    show(Math.round(ratio * last), event.currentTarget, ratio);
  };
  const transition = reduce ? { duration: 0 } : chartTransition;
  return (
    <>
      <div ref={chartRef} role="group" aria-label={`${name}. ${values.length} days. Use arrow keys to inspect values.`} aria-describedby={describedBy}
        tabIndex={0} className={cn("admin-spark dash-interactive-trend relative h-8 w-full touch-pan-y", className)}
        onPointerMove={move} onPointerDown={move} onPointerLeave={(event) => { if (event.pointerType !== "touch" && document.activeElement !== event.currentTarget) leave(); }}
        onFocus={() => show(last)} onBlur={close} onKeyDown={keyDown}>
        <svg aria-hidden="true" viewBox="0 0 120 32" preserveAspectRatio="none" className="size-full overflow-visible" data-testid="sparkline">
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={fill} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <m.path data-chart-path="area" initial={false} animate={{ d: shape.area }} transition={transition} fill={`url(#${gradient})`} />
          <m.path data-chart-path="trend" initial={false} animate={{ d: shape.line }} transition={transition} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          {active !== null ? <line x1={left * 1.2} x2={left * 1.2} y1={0} y2={32} stroke={color} strokeOpacity={0.35} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        <m.span aria-hidden="true" initial={false} animate={{ left: `${left}%`, top: `${top}%` }} transition={active !== null ? { duration: reduce ? 0 : 0.1 } : transition}
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card" style={{ background: color }} />
      </div>
      {tooltip}
    </>
  );
}
