import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * CircularCarousel (home refresh 2026-11-11): books laid along a gentle arc, in the spirit of the React Bits "Circular
 * Gallery" (a bent strip: the middle item sits highest, items to the sides drop and tilt along the curve). CSS 3D, one
 * rAF loop, no WebGL. Each item is drawn as a real book: the cover with a hinge and gloss, a spine on its left and a
 * cream page block on its right, so books turned to the side show their spine or their pages; a contact shadow under
 * each.
 *
 * - Steps on its own to the next book (pause, glide, settle in the middle; `speed` sets the pace); pauses while hovered,
 *   dragged, or for a moment after `active` was set.
 * - Drag sideways to move it; it settles with the nearest book in the middle. Clicking a side book brings it to the
 *   middle; clicking the middle book calls `onSelect`.
 * - `active` (controlled) glides the shortest way to that book; `onActiveChange` reports the book in the middle.
 * - Decorative for assistive tech (aria-hidden): give the same items as a real list next to it.
 * - Reduced motion: no glide, no intro; changes snap.
 */

export type CircularItem = { src?: string | null; alt?: string; title?: string; subtitle?: string };

type Props = {
  items: CircularItem[];
  cardWidth?: number;
  /** width / height */
  aspectRatio?: number;
  /** degrees per second (kept from the cylinder version): n items make 360° */
  speed?: number;
  captions?: boolean;
  intro?: "rise" | "none";
  active?: number;
  onActiveChange?: (index: number) => void;
  onSelect?: (index: number) => void;
  className?: string;
};

const CLOTH = ["#14207A", "#7A2E2A", "#2F5D4A", "#8A5A3B", "#4C5378", "#1E4E5C"];

export default function CircularCarousel({ items, cardWidth = 180, aspectRatio = 2 / 3, speed = 14, captions = false, intro = "rise", active, onActiveChange, onSelect, className }: Props) {
  const reduce = useReducedMotion() ?? false;
  const n = Math.max(items.length, 1);
  const cardHeight = cardWidth / aspectRatio;
  const spacing = cardWidth * 1.12; // arc length between two books
  const radius = cardWidth * 7.2; // the bend: larger = flatter
  const thick = Math.round(cardWidth * 0.085); // book thickness (spine / page block width)
  // One step to the next book every `dwell` ms (the old degrees-per-second, turned into time per book), so a book always
  // rests in the middle between steps.
  const dwell = Math.min(6000, Math.max(2200, (360 / n / Math.max(1, speed)) * 1000));

  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const st = useRef({ pos: 0, target: null as number | null, hover: false, drag: null as null | { x: number; pos: number }, front: -1, holdUntil: 0 });
  const report = useRef(onActiveChange);
  useEffect(() => {
    report.current = onActiveChange;
  }, [onActiveChange]);

  // Controlled: glide the shortest way to `active`.
  useEffect(() => {
    if (active === undefined || active < 0) return;
    const m = st.current;
    if (active === m.front && m.target === null) return;
    const base = ((m.pos % n) + n) % n;
    let delta = active - base;
    if (delta > n / 2) delta -= n;
    if (delta < -n / 2) delta += n;
    m.target = m.pos + delta;
    m.holdUntil = performance.now() + 2500;
  }, [active, n]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const m = st.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (m.target !== null) {
        const k = reduce ? 60 : 6;
        m.pos += (m.target - m.pos) * (1 - Math.exp(-k * dt));
        if (Math.abs(m.target - m.pos) < 0.002) {
          m.pos = m.target;
          m.target = null;
        }
      } else if (!m.drag && !m.hover && !reduce && now > m.holdUntil) {
        m.target = Math.round(m.pos) + 1;
        m.holdUntil = now + dwell;
      }
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < n; i++) {
        const el = cards.current[i];
        let r = (((i - m.pos) % n) + n) % n;
        if (r > n / 2) r -= n;
        if (Math.abs(r) < bestDist) {
          bestDist = Math.abs(r);
          best = i;
        }
        if (!el) continue;
        const abs = Math.abs(r);
        if (abs > 3.2) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        // Along the arc: the angle on the circle, then x/y on it, tilted along the curve and turned a little in 3D.
        const theta = (r * spacing) / radius;
        const x = radius * Math.sin(theta);
        const y = radius * (1 - Math.cos(theta));
        const near = Math.max(0, 1 - abs);
        const scale = 0.84 + 0.16 * near;
        el.style.transform = `translate3d(${x}px, ${y}px, ${near * 40 - abs * 30}px) rotateZ(${(theta * 180) / Math.PI}deg) rotateY(${-r * 16}deg) scale(${scale})`;
        el.style.zIndex = String(Math.round(100 - abs * 10));
        el.style.opacity = String(Math.max(0, Math.min(1, 3.2 - abs)));
        el.style.setProperty("--face", (0.55 + 0.45 * near).toFixed(3));
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
  }, [n, spacing, radius, dwell, reduce]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    st.current.drag = { x: e.clientX, pos: st.current.pos };
    st.current.target = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = st.current.drag;
    if (!g) return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) > 4) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    st.current.pos = g.pos - dx / spacing;
  };
  const endDrag = () => {
    const m = st.current;
    if (!m.drag) return;
    const moved = Math.abs(m.pos - m.drag.pos) > 0.02;
    m.drag = null;
    // settle with the nearest book in the middle
    m.target = Math.round(m.pos);
    m.holdUntil = performance.now() + 2000;
    if (moved) window.addEventListener("click", (ev) => ev.stopPropagation(), { capture: true, once: true });
  };
  // `at`: the click's timeStamp (the same clock as performance.now in the loop).
  const bringToFront = (i: number, at: number) => {
    const m = st.current;
    if (i === m.front) {
      onSelect?.(i);
      return;
    }
    const base = ((m.pos % n) + n) % n;
    let delta = i - base;
    if (delta > n / 2) delta -= n;
    if (delta < -n / 2) delta += n;
    m.target = Math.round(m.pos + delta);
    m.holdUntil = at + 2500;
  };

  return (
    <div
      aria-hidden="true"
      className={cn("circular-carousel relative size-full select-none overflow-hidden [perspective:1400px] [touch-action:pan-y]", intro === "rise" && !reduce && "circular-rise", className)}
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
      <div className="absolute left-1/2 top-[10%] [transform-style:preserve-3d]" style={{ width: 0, height: 0 }}>
        {items.map((item, i) => (
          <div
            key={`${item.title}-${i}`}
            ref={(el) => {
              cards.current[i] = el;
            }}
            onClick={(e) => bringToFront(i, e.timeStamp)}
            className="circular-card absolute cursor-pointer [transform-style:preserve-3d]"
            style={{ width: cardWidth, height: cardHeight, left: -cardWidth / 2, top: 0, "--thick": `${thick}px`, transformOrigin: "50% 50%" } as CSSProperties}
          >
            {/* contact shadow on the "table" under the book */}
            <span className="circular-shadow pointer-events-none absolute -bottom-5 left-[8%] h-6 w-[84%] rounded-[50%]" />
            {/* spine (left side of the book) */}
            <span className="circular-spine pointer-events-none absolute left-0 top-0 h-full" style={{ width: thick, background: CLOTH[i % CLOTH.length] }} />
            {/* page block (right side of the book) */}
            <span className="circular-pages pointer-events-none absolute right-0 top-[1.5%] h-[97%]" style={{ width: thick }} />
            {/* front cover */}
            <span className="circular-cover absolute inset-0 block overflow-hidden rounded-[3px_5px_5px_3px]">
              {item.src ? (
                <img src={item.src} alt="" draggable={false} loading="lazy" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center p-4 text-center font-display text-lg text-[#F6EFDF]" style={{ background: CLOTH[i % CLOTH.length] }}>
                  {item.title}
                </span>
              )}
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.3)_0_3%,rgb(255_255_255/0.22)_4%,transparent_11%),linear-gradient(118deg,rgb(255_255_255/0.18),transparent_42%)]" />
            </span>
            {captions ? (
              <span className="circular-caption absolute inset-x-0 top-full mt-7 text-center">
                {item.subtitle ? <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{item.subtitle}</span> : null}
                <span className="mt-0.5 block truncate font-display text-[15px] leading-tight text-foreground">{item.title}</span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
