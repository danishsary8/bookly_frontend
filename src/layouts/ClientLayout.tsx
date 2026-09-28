import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loading from "../components/ui/loading";
import { StorefrontSettingsProvider } from "../contexts/StorefrontSettingsContext";

// MASTER §5: entrances 220ms on ease-out, exits faster (~70%) so the next page is never kept waiting.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const FOCUS_WAIT_MS = 4000;

const ClientLayout = () => {
    const location = useLocation();
    const reduceMotion = useReducedMotion();
    const isFirstRoute = useRef(true);

    // On every route change after the first load, move keyboard/screen-reader focus into the new
    // page: to <main> as soon as the route renders, then on to the page's <h1> once it exists
    // (pages lazy-load and fetch, so the heading can arrive later), but only if focus is still
    // parked on <main>, never pulling it away from something the user moved to.
    // Hash links (e.g. "/#catalogue") keep the page's own scrolling and focus.
    useEffect(() => {
        if (isFirstRoute.current) {
            isFirstRoute.current = false;
            return;
        }
        if (location.hash) return;

        const main = document.getElementById("content");
        const started = performance.now();
        let frame = 0;
        let parkedOnMain = false;

        const focusQuietly = (element: HTMLElement) => {
            if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
            element.focus({ preventScroll: true });
        };

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
    }, [location.pathname, location.hash]);

    // New route starts at the top. Done in a layout effect (before paint) rather than after the
    // exit animation: with popLayout the pages overlap, and the cover morph (lib/coverMorph)
    // must measure the new page at its final scroll position.
    const firstPaint = useRef(true);
    useLayoutEffect(() => {
        if (firstPaint.current) { firstPaint.current = false; return; }
        if (location.hash) return;
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }, [location.pathname, location.hash]);

    return (
        <StorefrontSettingsProvider>
            <div className="min-h-screen bg-background">
                <Header />
                <main id="content" tabIndex={-1} className="relative">
                    {/* popLayout: the outgoing page is lifted out of flow and fades while the new one enters,
                        so shared-layout elements (the book-cover morph) exist in both at once. */}
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={location.pathname}
                            data-route={location.pathname}
                            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? { opacity: 1, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.15, ease: [0.2, 0, 0, 1] } }}
                            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
                        >
                            {/* Keeps the header and footer on screen while a lazy page loads. */}
                            <Suspense fallback={<div className="section-wrap py-10"><Loading /></div>}>
                                <Outlet />
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </main>
                <Footer />
            </div>
        </StorefrontSettingsProvider>
    );
};

export default ClientLayout;
