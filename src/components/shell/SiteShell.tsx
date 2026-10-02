import { Suspense, useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/motion/PageTransition";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";
import { closeShellPanel } from "@/stores/shell";
import { CartDrawer } from "./CartDrawer";
import { MobileMenu } from "./MobileMenu";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/*
 * The storefront frame: skip link, sticky header, the routed page (transition +
 * error boundary + lazy-load fallback), footer, and the overlays that live
 * outside the page (cart drawer, mobile menu, toasts).
 */

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

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#content"
        className="sr-only z-(--z-toast) rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" tabIndex={-1} className="relative flex-1 outline-none">
        <PageTransition>
          <RouteErrorBoundary>
            <Suspense fallback={<PageFallback />}>{children}</Suspense>
          </RouteErrorBoundary>
        </PageTransition>
      </main>
      <SiteFooter />
      <CartDrawer />
      <MobileMenu />
      <Toaster />
    </div>
  );
}
