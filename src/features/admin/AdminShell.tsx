import { Suspense, useState } from "react";
import { ExternalLink, LogOut, Menu, UserRound } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { navFor } from "./adminNav";
import { NotificationsBell } from "./NotificationsBell";
import { useStaff, useStaffSignOut } from "./staffSession";

const itemClass =
  "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 text-[15px] text-foreground outline-none data-[highlighted]:bg-secondary";

function Wordmark() {
  return (
    <Link to="/admin" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="font-display text-[1.6rem] leading-none text-primary">Bookly</span>
      <span className="rounded-[4px] border border-border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Staff</span>
    </Link>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const session = useStaff();
  return (
    <nav aria-label="Admin" className="grid gap-6">
      {navFor(session?.user.role).map((group) => (
        <div key={group.label} className="grid gap-1">
          <p className="px-3 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
          {group.items.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-h-10 items-center gap-3 rounded-md px-3 text-[15px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-lapis-tint text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const session = useStaff();
  const signOut = useStaffSignOut();
  const navigate = useNavigate();
  const user = session?.user;
  if (!user) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" className="gap-2 px-2.5" aria-label={`Account: ${user.name}`}>
          <span className="grid size-8 place-items-center rounded-full bg-lapis-tint text-primary">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden max-w-40 truncate text-[15px] font-semibold sm:block">{user.name}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-(--z-popover) min-w-60 rounded-xl border border-border bg-popover p-2 shadow-overlay">
          <div className="grid gap-1 px-3 pb-2 pt-1">
            <p className="font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <Badge tone={user.role === "admin" ? "info" : "neutral"} shape="tint" className="mt-1 w-fit">
              {user.role === "admin" ? "Admin" : "Staff"}
            </Badge>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/" target="_blank" rel="noreferrer">
              <ExternalLink className="size-[18px] text-muted-foreground" aria-hidden="true" /> View the shop
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={() => void signOut().then(() => navigate("/admin/login", { replace: true }))}>
            <LogOut className="size-[18px] text-muted-foreground" aria-hidden="true" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function PageFallback() {
  return (
    <SkeletonGroup label="Loading…" className="grid gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64 rounded-xl" />
    </SkeletonGroup>
  );
}

/*
 * The staff frame (pages/admin.md): a fixed sidebar at ≥ 1024px (a drawer on
 * smaller screens), a slim top bar with the notifications bell and the account
 * menu, and the page. No page transitions: staff move between screens quickly.
 */
export function AdminShell() {
  // Links in the drawer close it themselves (Nav's onNavigate).
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a
        href="#admin-content"
        className="sr-only z-(--z-toast) rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className="hidden border-r border-border bg-card lg:block">
        <div className="sticky top-0 grid max-h-dvh gap-8 overflow-y-auto px-4 py-5">
          <div className="px-2">
            <Wordmark />
          </div>
          <Nav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-(--z-header) flex h-16 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
            <Menu aria-hidden="true" />
          </Button>
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <UserMenu />
          </div>
        </header>
        <main id="admin-content" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <RouteErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent side="left" className="w-[18rem]">
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="px-3">
            <Nav onNavigate={() => setMenuOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
