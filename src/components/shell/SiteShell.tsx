import { cn } from "@/lib/utils";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/motion/PageTransition";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { closeShellPanel, useShellPanel, type ShellPanel } from "@/stores/shell";
import { AnnouncementBar } from "./AnnouncementBar";
import { OfflineBanner } from "./OfflineBanner";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { useT } from "@/i18n";

/*
 * The storefront frame: skip link, sticky header, the routed page (transition +
 * error boundary + lazy-load fallback), footer, and the overlays that live
 * outside the page (cart drawer, mobile menu). Toasts live at the app root.
 */

// The cart drawer and mobile menu (and the dialog code they need) aren't part of the first paint:
// they load when first opened, or earlier when the browser is idle.
const loadCartDrawer = () => import("./CartDrawer");
const PromoPopup = lazy(() => import("@/features/promotions/PromoPopup").then((mod) => ({ default: mod.PromoPopup })));
const SupportBubble = lazy(() => import("@/features/support/SupportBubble").then((mod) => ({ default: mod.SupportBubble })));
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
  const { dict } = useT();
  return (
    <SkeletonGroup
      label={dict.shell.loadingPage}
      className="container-shell grid min-h-[60vh] content-start gap-8 py-10 sm:py-12"
    >
      <div className="grid gap-3">
        <Skeleton className="h-3.5 w-36 rounded-full" />
        <Skeleton className="h-9 w-[min(22rem,75%)] rounded-lg" />
        <Skeleton className="h-4 w-[min(32rem,92%)] rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "grid gap-3 rounded-xl border border-border bg-card p-3",
              i === 3 && "hidden lg:grid",
              i === 2 && "hidden sm:grid",
            )}
          >
            <Skeleton className="aspect-[2/3] w-full rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
            <div className="mt-1 flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { dict } = useT();

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

  // Every storefront page shares the home page's warm paper (pages/shopping.md; home paints its own).
  const shopPaper = pathname !== "/";
  // Account pages render their own focused top bar (back to shop / account) without the storefront navbar.
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#content"
        className="sr-only z-(--z-toast) rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {dict.nav.skipToContent}
      </a>
      {!isAccount ? <AnnouncementBar /> : null}
      {!isAccount ? <SiteHeader /> : null}
      <OfflineBanner />
      {/* At least a screen tall: the footer stays below the fold while a page or its data loads, so it never jumps (layout shift). */}
      <main id="content" tabIndex={-1} className={cn("relative min-h-dvh flex-1 outline-none", shopPaper && "home-paper")}>
        <PageTransition>
          <RouteErrorBoundary>
            <Suspense fallback={<PageFallback />}>{children}</Suspense>
          </RouteErrorBoundary>
        </PageTransition>
      </main>
      {/* Home and the shopping pages (cart, checkout, confirmation) run their warm paper right down to the footer
          (their own bottom padding replaces the footer gap). pages/shopping.md. */}
      <SiteFooter className={pathname === "/" || shopPaper ? "mt-0" : undefined} />
      <Suspense fallback={null}>
        {cartOpened ? <CartDrawer /> : null}
        {menuOpened ? <MobileMenu /> : null}
        <SupportBubble />
        {/* Promotion pop-up (owner 2026-11-12): loads on its own, shows only when a promotion is live. */}
        <PromoPopup />
      </Suspense>
    </div>
  );
}
