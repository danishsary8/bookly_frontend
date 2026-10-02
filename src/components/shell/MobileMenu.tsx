import { NavLink, useLocation } from "react-router-dom";
import { useSession } from "@/api/session";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { closeShellPanel, openShellPanel, useShellPanel } from "@/stores/shell";
import { CurrencySwitch } from "./CurrencySwitch";
import { LiveSearch } from "./LiveSearch";
import { ThemeToggle } from "./ThemeToggle";
import { MOBILE_MENU_ID, accountNav, isActivePath, primaryNav } from "./nav";
import { useSignOut } from "./useSignOut";

/*
 * MASTER §6.10 mobile drawer (below 900px): search → main links (48px rows,
 * Gloock, active one in --primary with a 2px leading rule) → divider → account
 * links → currency + theme → Sign in / Sign out. Radix Dialog underneath, so
 * focus is trapped and Esc or the scrim closes it and returns focus.
 */

const linkClass = (active: boolean) =>
  cn(
    "relative flex min-h-12 items-center rounded-md px-3 font-display text-xl outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
    active ? "text-primary before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-primary" : "text-foreground hover:bg-secondary",
  );

export function MobileMenu() {
  const panel = useShellPanel();
  const location = useLocation();
  const session = useSession("customer");
  const signOut = useSignOut();

  return (
    <Drawer open={panel === "menu"} onOpenChange={(open) => (open ? openShellPanel("menu") : closeShellPanel())}>
      <DrawerContent id={MOBILE_MENU_ID} side="right" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="grid content-start gap-6">
          <LiveSearch id="mobile-search" onNavigate={closeShellPanel} inputClassName="h-12" />

          <nav aria-label="Main">
            <ul className="grid gap-1">
              <li>
                <NavLink to="/" onClick={closeShellPanel} className={linkClass(location.pathname === "/")} aria-current={location.pathname === "/" ? "page" : undefined}>
                  Home
                </NavLink>
              </li>
              {primaryNav.map((item) => {
                const active = isActivePath(location.pathname, item.to);
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} onClick={closeShellPanel} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <hr className="border-border" />

          <nav aria-label="Your account">
            <ul className="grid gap-1">
              {accountNav.map((item) => {
                const active = isActivePath(location.pathname, item.to);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={closeShellPanel}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center rounded-md px-3 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "text-primary" : "text-foreground hover:bg-secondary",
                      )}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center justify-between gap-3">
            <CurrencySwitch />
            <ThemeToggle />
          </div>
        </DrawerBody>
        <DrawerFooter>
          {session ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                closeShellPanel();
                void signOut();
              }}
            >
              Sign out
            </Button>
          ) : (
            <NavLink to="/login" onClick={closeShellPanel} className={cn(buttonVariants({ variant: "default" }), "w-full")}>
              Sign in
            </NavLink>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
