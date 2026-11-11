import { useEffect, useState } from "react";
import { m } from "motion/react";
import { Heart, Menu, ShoppingBag } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { openShellPanel, useShellPanel } from "@/stores/shell";
import { AccountMenu } from "./AccountMenu";
import { BrowseMenu } from "./BrowseMenu";
import { PreferencesMenu } from "./PreferencesMenu";
import { useSession } from "@/api/session";
import { transitions } from "@/lib/motion";
import { LiveSearch } from "./LiveSearch";
import { MOBILE_MENU_ID, isActivePath } from "./nav";
import { useCartCount } from "./useCartCount";
import { useT } from "@/i18n";

/*
 * Storefront header (pages/header.md). ≥ 900px: wordmark · Browse ▾ · New arrivals · Authors · search ·
 * Language/currency/theme · wishlist · cart · account. Mobile adds a full-width search row.
 * The header stays visible while scrolling; its shadow strengthens once the page has scrolled.
 */

export function Wordmark({ className }: { className?: string }) {
  const { dict } = useT();
  return (
    <Link
      to="/"
      aria-label={dict.navLinks.homeLabel}
      className={cn("rounded-md font-display text-[1.75rem] leading-none text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4", className)}
    >
      Bookly
    </Link>
  );
}

/** Add depth to the persistent header after scrolling. */
function useHeaderScroll() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return scrolled;
}

const links = [
  { label: "newArrivals", to: "/books?sort=newest", sort: "newest" },
  { label: "bestSellers", to: "/books?sort=best_selling", sort: "best_selling" },
  { label: "authors", to: "/authors", sort: null },
] as const;

export function SiteHeader() {
  const location = useLocation();
  const panel = useShellPanel();
  const count = useCartCount();
  const signedIn = Boolean(useSession("customer"));
  const { dict } = useT();
  // Search remains available while scrolling, including on the home page.
  const scrolled = useHeaderScroll();
  const sort = location.pathname === "/books" ? new URLSearchParams(location.search).get("sort") : null;
  const activeLink = links.find((item) => (item.sort ? item.sort === sort : isActivePath(location.pathname, item.to)))?.to;

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-(--z-header) h-(--header-h) border-b bg-card/90 backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 ease-out supports-[backdrop-filter]:bg-card/80 dark:bg-background/85",
        scrolled ? "border-transparent shadow-[0_8px_24px_-16px_rgb(20_32_122/0.35)]" : "border-border",
      )}
    >
      <div className="container-shell flex h-full flex-wrap items-center gap-x-3 gap-y-2 py-3 min-[900px]:flex-nowrap min-[900px]:gap-4 min-[900px]:py-0 lg:gap-6">
        <Wordmark />

        <nav aria-label={dict.navLinks.main} className="hidden min-[900px]:block">
          <ul className="flex items-center gap-0.5">
            <li>
              <BrowseMenu />
            </li>
            {links.map((item) => {
              const active = activeLink === item.to;
              return (
                <li key={item.to} className={item.label === "bestSellers" ? "hidden xl:block" : undefined}>
                  <NavLink
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-11 items-center whitespace-nowrap rounded-md px-3 text-[15px] font-medium transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label === "bestSellers" ? dict.homePage.bestSellers : dict.navLinks[item.label]}
                    {active ? (
                      <m.span layoutId="header-underline" transition={transitions.toggle} className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" />
                    ) : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <LiveSearch
          id="header-search"
          shortcut
          className="order-last w-full min-w-0 basis-full min-[900px]:order-none min-[900px]:ml-auto min-[900px]:max-w-sm min-[900px]:basis-auto xl:max-w-md"
        />

        <div className="ml-auto flex items-center gap-1 min-[900px]:ml-0">
          <PreferencesMenu className="mr-1 hidden min-[900px]:inline-flex" />
          <Link
            to={signedIn ? "/account/wishlist" : "/login?next=%2Faccount%2Fwishlist"}
            aria-label={dict.navLinks.wishlist}
            title={dict.navLinks.wishlist}
            className="hidden size-11 place-items-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[900px]:grid"
          >
            <Heart className="size-5" aria-hidden="true" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openShellPanel("cart")}
            aria-haspopup="dialog"
            aria-expanded={panel === "cart"}
            aria-label={count > 0 ? dict.nav.cartCount(count) : dict.nav.cart}
            data-cart-target=""
            className="relative"
          >
            <ShoppingBag aria-hidden="true" />
            {/* Pops briefly whenever the count changes. */}
            <span key={count} className="badge-pop absolute right-0.5 top-0.5">
              <CountBadge count={count} aria-hidden="true" />
            </span>
          </Button>
          <div className="ml-1 hidden min-[900px]:block">
            <AccountMenu />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openShellPanel("menu")}
            aria-expanded={panel === "menu"}
            aria-controls={MOBILE_MENU_ID}
            aria-label={dict.nav.menu}
            className="min-[900px]:hidden"
          >
            <Menu aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
