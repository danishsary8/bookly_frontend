import { useState } from "react";
import { BookOpen, Heart, House, Library, LogOut, Package, PenLine, Sparkles, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CountBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useOrderNotifications } from "@/features/orders/orderNotifications";
import { cn } from "@/lib/utils";
import { closeShellPanel, openShellPanel, useShellPanel } from "@/stores/shell";
import { CurrencySwitch } from "./CurrencySwitch";
import { LanguageSwitch } from "./LanguageSwitch";
import { LiveSearch } from "./LiveSearch";
import { SignOutDialog } from "./SignOutDialog";
import { ThemeSwitch } from "./ThemeToggle";
import { MOBILE_MENU_ID, accountNav, isActivePath, primaryNav } from "./nav";
import { useT } from "@/i18n";

/*
 * MASTER §6.10 mobile drawer (below 1024px): search → main links (48px rows,
 * Gloock, active one in --primary with a 2px leading rule) → divider → account
 * links → currency + theme → Sign in / Sign out. Radix Dialog underneath, so
 * focus is trapped and Esc or the scrim closes it and returns focus.
 */

/** One style for every link (owner 2026-11-17): icon + label, compact 44px rows, the current page softly highlighted. */
const linkClass = (active: boolean) =>
  cn(
    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[18px] [&_svg]:shrink-0",
    active ? "bg-lapis-tint text-primary" : "text-foreground hover:bg-secondary [&_svg]:text-muted-foreground",
  );
const ICONS: Record<string, LucideIcon> = {
  "/": House, "/books": BookOpen, "/authors": PenLine, "/series": Library, "/books?sort=newest": Sparkles,
  "/books?sort=best_selling": TrendingUp, "/account": UserRound, "/account/orders": Package, "/account/wishlist": Heart,
};
const groupLabel = "px-3 pb-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground";

export function MobileMenu() {
  const panel = useShellPanel();
  const location = useLocation();
  const session = useSession<Customer>("customer");
  const { unreadCount: unreadOrders } = useOrderNotifications();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { dict } = useT();

  return (
    <>
    <Drawer open={panel === "menu"} onOpenChange={(open) => (open ? openShellPanel("menu") : closeShellPanel())}>
      <DrawerContent id={MOBILE_MENU_ID} side="right" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>{dict.nav.menu}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="grid content-start gap-5">
          <LiveSearch id="mobile-search" onNavigate={closeShellPanel} inputClassName="h-12" />

          {/* Light / Dark near the top, labelled, so it is easy to find (owner 2026-11-16). */}
          <div className="grid gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{dict.shell.appearance}</p>
            <ThemeSwitch />
          </div>

          <nav aria-label={dict.navLinks.main}>
            <p className={groupLabel} aria-hidden="true">{dict.navLinks.shop}</p>
            <ul className="grid gap-0.5">
              <li>
                <NavLink to="/" onClick={closeShellPanel} className={linkClass(location.pathname === "/")} aria-current={location.pathname === "/" ? "page" : undefined}>
                  <House aria-hidden="true" />
                  {dict.navLinks.home}
                </NavLink>
              </li>
              {primaryNav.map((item) => {
                const active = isActivePath(location.pathname, item.to);
                const label = dict.navLinks[item.label];
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} onClick={closeShellPanel} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                      {(() => { const Icon = ICONS[item.to] ?? BookOpen; return <Icon aria-hidden="true" />; })()}
                      {label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <nav aria-label={dict.navLinks.yourAccount} className="border-t border-border pt-4">
            <p className={groupLabel} aria-hidden="true">{dict.navLinks.yourAccount}</p>
            <ul className="grid gap-0.5">
              {accountNav.map((item) => {
                const active = isActivePath(location.pathname, item.to);
                const label = dict.navLinks[item.label];
                const badge = item.to === "/account/orders" ? unreadOrders : 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={closeShellPanel}
                      aria-current={active ? "page" : undefined}
                      className={linkClass(active)}
                    >
                      {(() => { const Icon = ICONS[item.to] ?? UserRound; return <Icon aria-hidden="true" />; })()}
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <CountBadge count={badge} className="ml-auto" aria-hidden="true" />
                      {badge > 0 ? <span className="sr-only"> ({dict.shell.orderUpdates(badge)})</span> : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Language and currency, each on its own full-width row. */}
          <div className="grid gap-3">
            <LanguageSwitch className="w-full [&>*]:flex-1" />
            <CurrencySwitch className="w-full [&>*]:flex-1" />
          </div>
        </DrawerBody>
        <DrawerFooter>
          {session ? (
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive-tint hover:text-destructive"
              onClick={() => {
                closeShellPanel();
                setConfirmSignOut(true);
              }}
            >
              <LogOut className="size-[18px]" aria-hidden="true" />
              {dict.nav.signOut}
            </Button>
          ) : (
            <NavLink to="/login" onClick={closeShellPanel} className={cn(buttonVariants({ variant: "default" }), "w-full")}>
              {dict.nav.signIn}
            </NavLink>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
    <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} user={session?.user} />
    </>
  );
}
