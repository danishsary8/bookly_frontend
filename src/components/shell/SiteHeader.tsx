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
 * 🌐 EN·$ (language, currency, theme) · wishlist (signed in) · cart · account. Below: wordmark · cart · menu.
 * Motion (all off with reduced motion): the active link's underline slides between links; the header tucks
 * away while scrolling down and returns on scroll up, with a soft shadow once the page has scrolled.
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

/** Scroll state for the header: whether the page has scrolled, and whether to tuck the header away. */
function useHeaderScroll(locked: boolean) {
  const [state, setState] = useState({ scrolled: false, hidden: false });
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const down = y > last + 4;
        const up = y < last - 4;
        setState((prev) => ({
          scrolled: y > 8,
          hidden: locked ? false : down && y > 160 ? true : up || y < 160 ? false : prev.hidden,
        }));
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [locked]);
  return state;
}

const links = [
  { label: "newArrivals", to: "/books?sort=newest" },
  { label: "authors", to: "/authors" },
] as const;

/** On the home page the hero has its own big search; the header one waits until the hero's has scrolled away. */
function useHeroSearchInView(pathname: string) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (pathname !== "/") return;
    let frame = 0;
    const check = () => {
      const el = document.getElementById("hero-search");
      setInView(el ? el.getBoundingClientRect().bottom > 80 : false);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    check();
    // The home page is loaded after the header: keep checking briefly until the hero's search exists.
    let tries = 0;
    const late = window.setInterval(() => {
      check();
      if (++tries > 15 || document.getElementById("hero-search")) window.clearInterval(late);
    }, 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(late);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);
  return pathname === "/" && inView;
}

export function SiteHeader() {
  const location = useLocation();
  const panel = useShellPanel();
  const count = useCartCount();
  const signedIn = Boolean(useSession("customer"));
  const { dict } = useT();
  const { scrolled, hidden } = useHeaderScroll(panel !== null);
  const heroSearch = useHeroSearchInView(location.pathname);
  const newest = location.pathname === "/books" && new URLSearchParams(location.search).get("sort") === "newest";
  const activeLink = newest ? "/books?sort=newest" : isActivePath(location.pathname, "/authors") ? "/authors" : undefined;

  return (
    <header
      data-hidden={hidden || undefined}
      className={cn(
        "site-header sticky top-0 z-(--z-header) h-(--header-h) border-b bg-card/90 backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 ease-out supports-[backdrop-filter]:bg-card/80 dark:bg-background/85",
        scrolled ? "border-transparent shadow-[0_8px_24px_-16px_rgb(20_32_122/0.35)]" : "border-border",
        hidden && "-translate-y-full",
      )}
    >
      <div className="container-shell flex h-full items-center gap-4 lg:gap-6">
        <Wordmark />

        <nav aria-label={dict.navLinks.main} className="hidden min-[900px]:block">
          <ul className="flex items-center gap-0.5">
            <li>
              <BrowseMenu />
            </li>
            {links.map((item) => {
              const active = activeLink === item.to;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-11 items-center whitespace-nowrap rounded-md px-3 text-[15px] font-medium transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {dict.navLinks[item.label]}
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
          className={cn(
            "ml-auto hidden w-full max-w-sm transition-[opacity,translate] duration-300 min-[900px]:block xl:max-w-md",
            heroSearch && "pointer-events-none invisible -translate-y-1 opacity-0",
          )}
        />

        <div className="ml-auto flex items-center gap-1 min-[900px]:ml-0">
          <PreferencesMenu className="mr-1 hidden min-[900px]:inline-flex" />
          {signedIn ? (
            <Link
              to="/account/wishlist"
              aria-label={dict.navLinks.wishlist}
              title={dict.navLinks.wishlist}
              className="hidden size-11 place-items-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[900px]:grid"
            >
              <Heart className="size-5" aria-hidden="true" />
            </Link>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openShellPanel("cart")}
            aria-haspopup="dialog"
            aria-expanded={panel === "cart"}
            aria-label={count > 0 ? dict.nav.cartCount(count) : dict.nav.cart}
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
