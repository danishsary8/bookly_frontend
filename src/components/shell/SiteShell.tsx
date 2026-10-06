import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/motion/PageTransition";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { closeShellPanel, useShellPanel, type ShellPanel } from "@/stores/shell";
import { OfflineBanner } from "./OfflineBanner";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/*
 * The storefront frame: skip link, sticky header, the routed page (transition +
 * error boundary + lazy-load fallback), footer, and the overlays that live
 * outside the page (cart drawer, mobile menu). Toasts live at the app root.
 */

// The cart drawer and mobile menu (and the dialog code they need) aren't part of the first paint:
// they load when first opened, or earlier when the browser is idle.
const loadCartDrawer = () => import("./CartDrawer");
const loadMobileMenu = () => import("./MobileMenu");
const CartDrawer = lazy(() => loadCartDrawer().then((mod) => ({ default: mod.CartDrawer })));
const MobileMenu = lazy(() => loadMobileMenu().then((mod) => ({ default: mod.MobileMenu })));

/** Mounts an overlay from the first time it opens, then keeps it (so it can animate closed). */
function useOpenedOnce(panel: ShellPanel, which: ShellPanel) {
  const [opened, setOpened] = useState(false);
  if (!opened && panel === which) setOpened(true);
  return opened;
}

function PageFallback() {
  return (
    <SkeletonGroup label="Loading page…" className="container-shell grid gap-4 py-12">
      <Skeleton className="h-3.5 w-48" />
      <Skeleton className="h-9 w-[40%]" />
      <Skeleton className="h-5 w-[70%]" />
    </SkeletonGroup>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // A link inside a drawer navigates; the drawer shouldn't stay open over the new page.
  useEffect(() => closeShellPanel(), [pathname]);

  const panel = useShellPanel();
  const cartOpened = useOpenedOnce(panel, "cart");
  const menuOpened = useOpenedOnce(panel, "menu");
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
    idle(() => {
      void loadCartDrawer();
      void loadMobileMenu();
    });
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#content"
        className="sr-only z-(--z-toast) rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader />
      <OfflineBanner />
      {/* At least a screen tall: the footer stays below the fold while a page or its data loads, so it never jumps (layout shift). */}
      <main id="content" tabIndex={-1} className="relative min-h-dvh flex-1 outline-none">
        <PageTransition>
          <RouteErrorBoundary>
            <Suspense fallback={<PageFallback />}>{children}</Suspense>
          </RouteErrorBoundary>
        </PageTransition>
      </main>
      <SiteFooter />
      <Suspense fallback={null}>
        {cartOpened ? <CartDrawer /> : null}
        {menuOpened ? <MobileMenu /> : null}
      </Suspense>
    </div>
  );
}
