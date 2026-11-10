import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * CircularCarousel: cards on a slowly turning cylinder (CSS 3D, one rAF loop, no WebGL). Written for Bookly in the
 * spirit of the React Bits "Circular Carousel" (cylinder preset, "rise" intro, captions), which could not be fetched
 * from this build machine.
 *
 * - Turns on its own at `speed` degrees per second; pauses while hovered, dragged or when `active` was just set.
 * - Drag sideways to spin it; it settles with the nearest card in front.
 * - `active` (controlled) spins the shortest way to that card; `onActiveChange` reports the card in front.
 * - Cards turned away from the viewer dim; only the front card is clickable (`onSelect`).
 * - Decorative for assistive tech (aria-hidden): give the same items as a real list next to it.
 * - Reduced motion: no auto-turn, no intro; changes snap.
 */

export type CircularItem = { src?: string | null; alt?: string; title?: string; subtitle?: string };

type Props = {
  items: CircularItem[];
  cardWidth?: number;
  /** width / height */
  aspectRatio?: number;
  /** degrees per second */
  speed?: number;
  captions?: boolean;
  intro?: "rise" | "none";
  active?: number;
  onActiveChange?: (index: number) => void;
  onSelect?: (index: number) => void;
  className?: string;
};

export default function CircularCarousel({ items, cardWidth = 180, aspectRatio = 2 / 3, speed = 14, captions = false, intro = "rise", active, onActiveChange, onSelect, className }: Props) {
  const reduce = useReducedMotion() ?? false;
  const n = Math.max(items.length, 1);
  const step = 360 / n;
  const radius = Math.round((cardWidth * 1.08) / (2 * Math.tan(Math.PI / n)));
  const cardHeight = cardWidth / aspectRatio;

  const ring = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const st = useRef({ angle: 0, target: null as number | null, hover: false, drag: null as null | { x: number; angle: number }, front: -1, holdUntil: 0 });
  const report = useRef(onActiveChange);
  useEffect(() => {
    report.current = onActiveChange;
  }, [onActiveChange]);

  // Controlled: spin the shortest way to `active`.
  useEffect(() => {
    if (active === undefined || active < 0) return;
    const m = st.current;
    if (active === m.front && m.target === null) return;
    const goal = -active * step;
    const delta = ((((goal - m.angle) % 360) + 540) % 360) - 180;
    m.target = m.angle + delta;
    m.holdUntil = performance.now() + 2500;
  }, [active, step]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const m = st.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (m.target !== null) {
        const k = reduce ? 60 : 6;
        m.angle += (m.target - m.angle) * (1 - Math.exp(-k * dt));
        if (Math.abs(m.target - m.angle) < 0.05) {
          m.angle = m.target;
          m.target = null;
        }
      } else if (!m.drag && !m.hover && !reduce && now > m.holdUntil) {
        m.angle -= speed * dt;
      }
      if (ring.current) ring.current.style.transform = `translateZ(${-radius}px) rotateY(${m.angle}deg)`;
      let best = 0;
      let bestCos = -2;
      for (let i = 0; i < n; i++) {
        const el = cards.current[i];
        const c = Math.cos(((m.angle + i * step) * Math.PI) / 180);
        if (c > bestCos) {
          bestCos = c;
          best = i;
        }
        if (el) el.style.setProperty("--face", Math.max(0, c).toFixed(3));
      }
      if (best !== m.front) {
        m.front = best;
        cards.current.forEach((el, i) => el?.toggleAttribute("data-front", i === best));
        report.current?.(best);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [n, step, radius, speed, reduce]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    st.current.drag = { x: e.clientX, angle: st.current.angle };
    st.current.target = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = st.current.drag;
    if (!g) return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) > 4) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    st.current.angle = g.angle + dx * 0.35;
  };
  const endDrag = () => {
    const m = st.current;
    if (!m.drag) return;
    const moved = Math.abs(m.angle - m.drag.angle) > 1;
    m.drag = null;
    // settle with the nearest card in front
    m.target = Math.round(m.angle / step) * step;
    m.holdUntil = performance.now() + 2000;
    if (moved) window.addEventListener("click", (ev) => ev.stopPropagation(), { capture: true, once: true });
  };

  return (
    <div
      aria-hidden="true"
      className={cn("circular-carousel relative size-full select-none [perspective:1100px] [touch-action:pan-y]", intro === "rise" && !reduce && "circular-rise", className)}
      onPointerEnter={() => (st.current.hover = true)}
      onPointerLeave={() => {
        st.current.hover = false;
        endDrag();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="absolute left-1/2 top-[44%] [transform-style:preserve-3d] [transform:rotateX(-7deg)]" style={{ width: 0, height: 0 }}>
        <div ref={ring} className="[transform-style:preserve-3d]">
          {items.map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              ref={(el) => {
                cards.current[i] = el;
              }}
              onClick={() => {
                if (i === st.current.front) onSelect?.(i);
              }}
              className="circular-card absolute"
              style={{ width: cardWidth, height: cardHeight, left: -cardWidth / 2, top: -cardHeight / 2, transform: `rotateY(${i * step}deg) translateZ(${radius}px)` } as CSSProperties}
            >
              {item.src ? (
                <img src={item.src} alt="" draggable={false} loading="lazy" className="size-full rounded-md object-cover" />
              ) : (
                <span className="grid size-full place-items-center rounded-md bg-primary p-4 text-center font-display text-lg text-primary-foreground">{item.title}</span>
              )}
              <span className="pointer-events-none absolute inset-0 rounded-md bg-[linear-gradient(90deg,rgb(0_0_0/0.22)_0_2.5%,rgb(255_255_255/0.16)_3.5%,transparent_9%),linear-gradient(120deg,rgb(255_255_255/0.14),transparent_45%)]" />
              {captions ? (
                <span className="circular-caption absolute inset-x-0 top-full mt-3 text-center">
                  {item.subtitle ? <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{item.subtitle}</span> : null}
                  <span className="mt-0.5 block truncate font-display text-[15px] leading-tight text-foreground">{item.title}</span>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
