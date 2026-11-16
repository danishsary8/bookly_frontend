import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ChartDatum = { label: string; value: string; detail?: string };
const INSPECT_EVENT = "bookly-dashboard-chart-inspect";

/** Inspect with a pointer, touch or arrows. Bento charts reuse their enclosing link's keyboard focus. */
export function useChartInspection(points: ChartDatum[], withinLink = false) {
  const ref = useRef<HTMLDivElement>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  const [selection, setSelection] = useState<{ index: number; left: number; top: number; below: boolean } | null>(null);
  const active = selection && points.length ? Math.min(selection.index, points.length - 1) : null;
  const show = useCallback((index: number, target?: HTMLElement, fraction = 0.5) => {
    clearTimeout(dismissTimer.current);
    const node = target ?? ref.current;
    if (!node || !points.length) return;
    window.dispatchEvent(new CustomEvent(INSPECT_EVENT, { detail: id }));
    const rect = node.getBoundingClientRect();
    const below = rect.top < 120;
    const next = {
      index: Math.max(0, Math.min(points.length - 1, index)),
      left: Math.max(124, Math.min(innerWidth - 124, rect.left + rect.width * fraction)),
      top: below ? Math.min(innerHeight - 88, rect.bottom + 10) : rect.top - 10,
      below,
    };
    setSelection((previous) => previous && Object.keys(next).every((key) => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
  }, [points.length, id]);
  const close = useCallback(() => { clearTimeout(dismissTimer.current); setSelection(null); }, []);
  const leave = useCallback(() => { clearTimeout(dismissTimer.current); dismissTimer.current = setTimeout(close, 180); }, [close]);
  const keyDown = useCallback((event: KeyboardEvent | React.KeyboardEvent) => {
    if (event.key === "Escape") { event.stopPropagation(); close(); return; }
    const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    show(event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : (active ?? points.length - 1) + step);
  }, [active, close, points.length, show]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const replace = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) close(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", close, true);
    document.addEventListener("keydown", escape);
    window.addEventListener(INSPECT_EVENT, replace);
    return () => { clearTimeout(dismissTimer.current); document.removeEventListener("pointerdown", outside); document.removeEventListener("scroll", close, true); document.removeEventListener("keydown", escape); window.removeEventListener(INSPECT_EVENT, replace); };
  }, [close, id]);
  useEffect(() => {
    if (!withinLink) return;
    const link = ref.current?.closest("a");
    if (!link) return;
    const focus = () => show(points.length - 1);
    const description = link.getAttribute("aria-describedby");
    if (active !== null) link.setAttribute("aria-describedby", [description, id].filter(Boolean).join(" "));
    link.addEventListener("focus", focus);
    link.addEventListener("blur", close);
    link.addEventListener("keydown", keyDown);
    return () => {
      link.removeEventListener("focus", focus); link.removeEventListener("blur", close); link.removeEventListener("keydown", keyDown);
      if (description === null) link.removeAttribute("aria-describedby"); else link.setAttribute("aria-describedby", description);
    };
  }, [withinLink, points.length, show, close, keyDown, active, id]);
  const point = active === null ? null : points[active];
  return {
    ref, active, show, close, leave, keyDown,
    describedBy: point ? id : undefined,
    tooltip: selection && point ? createPortal(
      <div id={id} role="tooltip" aria-live="polite" className="dash-data-tooltip" data-below={selection.below || undefined} style={{ left: selection.left, top: selection.top }}
        onPointerEnter={() => clearTimeout(dismissTimer.current)} onPointerLeave={leave}>
        <span>{point.label}</span><strong>{point.value}</strong>
        {point.detail ? <span className="dash-data-tooltip-note">{point.detail}</span> : null}
      </div>, document.body,
    ) : null,
  };
}
