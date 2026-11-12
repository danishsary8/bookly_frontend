import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const storageKey = (key: string) => `bookly:scroll:${key}`;

/*
 * Keeps a listing's scroll position per history entry, so Back from a book page lands on the same row. The browser's
 * own restoration runs before the lazy page and its results exist (the page is still short), so it usually ends at
 * the top; this waits for `ready` (results on screen) and scrolls then. Positions live in sessionStorage, keyed by
 * the history entry, so they survive the listing unmounting and never leak into a new visit.
 */
export function useScrollMemory(ready: boolean) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const key = storageKey(location.key);
  const href = location.pathname + location.search;
  const restored = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // A page leaving through the route transition still hears the next page's scroll-to-top; ignore it.
        if (window.location.pathname + window.location.search !== href) return;
        try {
          sessionStorage.setItem(key, String(Math.round(window.scrollY)));
        } catch {
          // Storage full or blocked: Back simply starts at the top.
        }
      });
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
    };
  }, [key, href]);

  useEffect(() => {
    if (!ready || navigationType !== "POP" || restored.current === key) return;
    let saved: number | null = null;
    try {
      const value = sessionStorage.getItem(key);
      saved = value === null ? null : Number(value);
    } catch {
      saved = null;
    }
    if (!saved || Number.isNaN(saved)) return;
    // Marked done inside the frame: StrictMode's extra effect run cancels the first frame and must try again.
    const frame = requestAnimationFrame(() => {
      restored.current = key;
      window.scrollTo({ top: saved, left: 0, behavior: "instant" as ScrollBehavior });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, navigationType, key]);
}
