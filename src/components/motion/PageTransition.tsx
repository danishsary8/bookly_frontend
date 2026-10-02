import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation, useNavigationType } from "react-router-dom";
import { duration, ease, transitions } from "@/lib/motion";

/*
 * MASTER §5 page transition: the new page fades in rising 8px (360ms ease-out),
 * the old one fades out in 150ms. popLayout lifts the old page out of flow so
 * shared-layout elements (the book-cover morph) exist in both at once.
 * Reduced motion: the global Motion config makes the swap instant.
 *
 * Also owns what a route change means for the visitor:
 * - scroll: a new page (PUSH/REPLACE) starts at the top; Back/Forward keep the
 *   browser's restored position; hash links scroll themselves.
 * - focus: moves to <main>, then to the new page's <h1> once it renders (pages
 *   lazy-load and fetch), so screen readers announce the change, but never
 *   pulls focus away from something the visitor already moved to.
 */

const FOCUS_WAIT_MS = 4000;

const focusQuietly = (element: HTMLElement) => {
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
};

export function PageTransition({ children, mainId = "content" }: { children: ReactNode; mainId?: string }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const firstRoute = useRef(true);
  const firstPaint = useRef(true);

  useLayoutEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    if (location.hash || navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname, location.hash, navigationType]);

  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    if (location.hash) return;

    const main = document.getElementById(mainId);
    const started = performance.now();
    let frame = 0;
    let parkedOnMain = false;

    const step = () => {
      const route = document.querySelector<HTMLElement>(`[data-route="${CSS.escape(location.pathname)}"]`);
      if (route && main && !parkedOnMain) {
        focusQuietly(main);
        parkedOnMain = true;
      }
      const heading = route?.querySelector<HTMLElement>("h1");
      if (heading && parkedOnMain) {
        if (document.activeElement === main) focusQuietly(heading);
        return;
      }
      if (performance.now() - started > FOCUS_WAIT_MS) return;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, mainId]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        data-route={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: transitions.page }}
        exit={{ opacity: 0, transition: { duration: duration.hover, ease: ease.standard } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
