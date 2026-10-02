import { Menu, ShoppingBag } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { openShellPanel, useShellPanel } from "@/stores/shell";
import { AccountMenu } from "./AccountMenu";
import { CurrencySwitch } from "./CurrencySwitch";
import { LiveSearch } from "./LiveSearch";
import { ThemeToggle } from "./ThemeToggle";
import { MOBILE_MENU_ID, isActivePath, primaryNav } from "./nav";
import { useCartCount } from "./useCartCount";

/*
 * MASTER §6.10 header: sticky, 64px (72px ≥ 900px), hairline bottom border and
 * no shadow (pages/header.md §2). ≥ 900px: wordmark · nav · search · currency ·
 * theme · cart · account. Below: wordmark · cart · menu button; everything else
 * moves into the mobile menu drawer.
 */

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Bookly home"
      className={cn("rounded-md font-display text-[1.75rem] leading-none text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4", className)}
    >
      Bookly
    </Link>
  );
}

export function SiteHeader() {
  const location = useLocation();
  const panel = useShellPanel();
  const count = useCartCount();

  return (
    <header className="sticky top-0 z-(--z-header) h-(--header-h) border-b border-border bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/85 dark:bg-background/90">
      <div className="container-shell flex h-full items-center gap-4 lg:gap-6">
        <Wordmark />

        <nav aria-label="Main" className="ml-2 hidden min-[900px]:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => {
              const active = isActivePath(location.pathname, item.to);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-11 items-center rounded-md px-3 text-[15px] font-medium transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                    {active ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" /> : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <LiveSearch id="header-search" shortcut className="ml-auto hidden w-full max-w-sm min-[900px]:block xl:max-w-md" />

        <div className="ml-auto flex items-center gap-1 min-[900px]:ml-0">
          <CurrencySwitch className="hidden min-[900px]:inline-flex" />
          <ThemeToggle className="hidden min-[900px]:inline-flex" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openShellPanel("cart")}
            aria-haspopup="dialog"
            aria-expanded={panel === "cart"}
            aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"}
            className="relative"
          >
            <ShoppingBag aria-hidden="true" />
            <CountBadge count={count} aria-hidden="true" className="absolute right-0.5 top-0.5" />
          </Button>
          <div className="hidden min-[900px]:block">
            <AccountMenu />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openShellPanel("menu")}
            aria-expanded={panel === "menu"}
            aria-controls={MOBILE_MENU_ID}
            aria-label="Menu"
            className="min-[900px]:hidden"
          >
            <Menu aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
