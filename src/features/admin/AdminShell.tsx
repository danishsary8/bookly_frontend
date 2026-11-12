import { Suspense, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserRound } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { navFor } from "./adminNav";
import { COUNT_FOR, badgeText, useMenuCounts } from "./menuCounts";
import { QuickJump } from "./QuickJump";
import { NotificationsBell } from "./NotificationsBell";
import { useNewOrderWatch } from "./orders/newOrders";
import { useAdminAutoRefresh } from "./autoRefresh";
import { useStaff, useStaffSignOut } from "./staffSession";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import "./admin.css";
import { SupportMenuBadge } from "@/features/support/SupportMenuBadge";
import { StaffAssistantDialog } from "@/features/assistant/StaffAssistantDialog";

const itemClass =
  "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 text-[15px] text-foreground outline-none data-[highlighted]:bg-secondary";

function Wordmark() {
  return (
    <Link to="/admin" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-5" aria-hidden="true" /></span><span className="admin-brand-label font-display text-[1.6rem] leading-none text-primary">Bookly</span>
      <span className="admin-brand-label rounded-[4px] bg-lapis px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-on-lapis max-sm:sr-only">Staff</span>
    </Link>
  );
}

function Nav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const session = useStaff();
  const counts = useMenuCounts(Boolean(session)).data;
  return (
    <nav aria-label="Admin" className="admin-navigation grid gap-6">
      {navFor(session?.user.role).map((group) => (
        <div key={group.label} className="grid gap-1">
          <p className="admin-nav-group flex items-center gap-2 px-3 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-4 bg-current opacity-60" aria-hidden="true" />
            {group.label}
          </p>
          {group.items.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "admin-nav-link relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-lapis-tint font-semibold text-primary before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="admin-nav-label">{label}</span>
              {to === "/admin/support" ? <SupportMenuBadge /> : null}
              {(() => {
                const badge = COUNT_FOR[to];
                const n = badge && counts ? counts[badge.key] : 0;
                return n > 0 ? (
                  <span className="admin-nav-count ml-auto min-w-6 rounded-md bg-lapis-tint px-1.5 py-0.5 text-center text-xs font-bold tabular-nums text-primary">
                    <span aria-hidden="true">{badgeText(n)}</span>
                    <span className="sr-only">, {badge.label(n)}</span>
                  </span>
                ) : null;
              })()}
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
        <Button variant="ghost" className="gap-2 px-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-lapis-tint text-primary">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden text-left sm:grid"><span className="max-w-36 truncate text-sm font-semibold">{user.name}</span>{" "}<span className="text-xs font-normal text-muted-foreground">{user.role === "admin" ? "Administrator" : "Staff member"}</span></span><span className="sr-only"> account menu</span><ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
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
            <Link to="/admin/security">
              <ShieldCheck className="size-[18px] text-muted-foreground" aria-hidden="true" /> Security & sessions
            </Link>
          </DropdownMenu.Item>
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
 * menu, and the page. Collapsing preserves room for dense working tables.
 */
export function AdminShell() {
  // Links in the drawer close it themselves (Nav's onNavigate).
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("bookly.admin.sidebar") === "collapsed"; }
    catch { return false; }
  });
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("bookly.admin.sidebar", next ? "collapsed" : "expanded"); }
    catch { /* The menu still works when browser storage is unavailable. */ }
  };
  const session = useStaff();
  useNewOrderWatch(session?.user);
  useAdminAutoRefresh(Boolean(session));

  return (
    <div className="admin-workspace min-h-dvh bg-background lg:grid" data-collapsed={collapsed}>
      <a
        href="#admin-content"
        className="sr-only z-(--z-toast) rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside aria-label="Workspace sidebar" className="admin-sidebar hidden border-r border-border bg-card lg:block">
        <div className="admin-sidebar-inner sticky top-0 grid max-h-dvh gap-7 overflow-y-auto px-3 py-5">
          <div className="px-2">
            <Wordmark />
          </div>
          <Nav collapsed={collapsed} />
          <Link to="/" target="_blank" rel="noreferrer" className="admin-shop-link flex min-h-11 items-center gap-3 rounded-md border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"><ExternalLink className="size-[18px] shrink-0" aria-hidden="true" /><span className="admin-nav-label">Open storefront</span></Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="admin-topbar sticky top-0 z-(--z-header) flex h-16 items-center gap-1 border-b border-border bg-card/95 px-3 backdrop-blur-sm sm:gap-2 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
            <Menu aria-hidden="true" />
          </Button>
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </Button>
          <span aria-hidden="true" className="mx-2 hidden h-5 w-px bg-border lg:block" />
          <QuickJump />
          <div className="ml-auto flex items-center gap-1">
            <StaffAssistantDialog />
            <ThemeToggle />
            <NotificationsBell />
            <UserMenu />
          </div>
        </header>
        <main id="admin-content" tabIndex={-1} className="admin-main flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
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
