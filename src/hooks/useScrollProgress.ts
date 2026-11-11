import { useEffect, useState, type RefObject } from "react";

/** How far a sideways-scrolling row is scrolled: thumb size and position (0-1), for <ScrollProgress>. */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [bar, setBar] = useState({ size: 1, at: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const room = el.scrollWidth - el.clientWidth;
      setBar({ size: Math.min(1, el.clientWidth / Math.max(el.scrollWidth, 1)), at: room > 0 ? el.scrollLeft / room : 0 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass what changes the row's width
  }, deps);
  return bar;
}
