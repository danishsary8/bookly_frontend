import { Suspense, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserRound } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { groupFor, navFor } from "./adminNav";
import { COUNT_FOR, badgeText, useMenuCounts } from "./menuCounts";
import { QuickJump } from "./QuickJump";
import { NotificationsBell } from "./NotificationsBell";
import { useNewOrderWatch } from "./orders/newOrders";
import { useAdminAutoRefresh } from "./autoRefresh";
import { useStaff, useStaffSignOut } from "./staffSession";
import { portalBase, portalLabel, portalPath, usePortal } from "./portal";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import "./admin.css";
import { SupportMenuBadge } from "@/features/support/SupportMenuBadge";
import { StaffAssistantDialog } from "@/features/assistant/StaffAssistantDialog";

const itemClass =
  "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 text-[15px] text-foreground outline-none data-[highlighted]:bg-secondary";

function Wordmark({ onRail = false }: { onRail?: boolean }) {
  const portal = usePortal();
  return (
    <Link to={portalBase(portal)} className={cn("flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring", onRail && "admin-rail-brand")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", onRail ? "bg-primary text-gold shadow-[0_6px_14px_-8px_rgb(20_32_122/0.7)]" : "bg-primary text-primary-foreground")}><BookOpen className="size-5" aria-hidden="true" /></span>
      <span className="admin-brand-label admin-brand-word font-display text-[1.55rem] leading-none text-primary">Bookly</span>
      <span className={cn("admin-brand-label rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.18em] max-sm:sr-only", "bg-lapis text-on-lapis")}>{portalLabel(portal)}</span>
    </Link>
  );
}

function Nav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const session = useStaff();
  const portal = usePortal();
  const { pathname } = useLocation();
  const activeGroupLabel = groupFor(pathname)?.label;
  const counts = useMenuCounts(Boolean(session)).data;
  const supportPath = portalPath(portal, "support");

  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("bookly.admin.navGroups");
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  // Groups start folded except the one holding the current page; a group the user opens or closes stays that way.
  const toggleGroup = (label: string, open: boolean) => {
    setClosedGroups((prev) => {
      const next = { ...prev, [label]: open };
      try {
        localStorage.setItem("bookly.admin.navGroups", JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  };

  return (
    <nav aria-label={portalLabel(portal)} className="admin-navigation grid gap-3.5">
      {navFor(session?.user.role, portal).map((group) => {
        const isCurrentGroup = group.label === activeGroupLabel;
        const isGroupOpen = collapsed || isCurrentGroup || closedGroups[group.label] === false;
        const groupCount = group.items.reduce((sum, item) => {
          const badge = COUNT_FOR[item.to];
          return sum + (badge && counts ? counts[badge.key] : 0);
        }, 0);

        return (
          <div key={group.label} data-tone={group.tone} className="grid gap-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(group.label, isGroupOpen)}
              aria-expanded={isGroupOpen}
              className="admin-nav-group flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-3 py-1 text-left text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="admin-nav-group-dot shrink-0" aria-hidden="true" />
                <span className="truncate">{group.label}</span>
              </span>
              <span className="flex items-center gap-1.5">
                {!isGroupOpen && groupCount > 0 ? (
                  <span className="admin-nav-count min-w-5 rounded-full px-1.5 py-0.2 text-center text-[10px] font-bold tabular-nums">
                    {badgeText(groupCount)}
                  </span>
                ) : null}
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    !isGroupOpen && "-rotate-90",
                  )}
                  aria-hidden="true"
                />
              </span>
            </button>
            {isGroupOpen
              ? group.items.map(({ to, label, Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    title={collapsed ? label : undefined}
                    onClick={onNavigate}
                    className="admin-nav-link relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14.5px] font-medium outline-none"
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className="admin-nav-label truncate">{label}</span>
                    {to === supportPath ? <SupportMenuBadge /> : null}
                    {(() => {
                      const badge = COUNT_FOR[to];
                      const n = badge && counts ? counts[badge.key] : 0;
                      return n > 0 ? (
                        <span className="admin-nav-count ml-auto min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums">
                          <span aria-hidden="true">{badgeText(n)}</span>
                          <span className="sr-only">, {badge.label(n)}</span>
                        </span>
                      ) : null;
                    })()}
                  </NavLink>
                ))
              : null}
          </div>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const session = useStaff();
  const portal = usePortal();
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
            <Link to={portalPath(portal, "security")}>
              <ShieldCheck className="size-[18px] text-muted-foreground" aria-hidden="true" /> Security & sessions
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/" target="_blank" rel="noreferrer">
              <ExternalLink className="size-[18px] text-muted-foreground" aria-hidden="true" /> View the shop
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={() => void signOut().then(() => navigate(portalPath(portal, "login"), { replace: true }))}>
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
  const portal = usePortal();
  useNewOrderWatch(session?.user, portal);
  useAdminAutoRefresh(Boolean(session));

  return (
    <div className="admin-workspace min-h-dvh bg-background lg:grid" data-collapsed={collapsed}>
      <a
        href="#admin-content"
        className="sr-only z-(--z-toast) rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside aria-label="Workspace sidebar" className="admin-sidebar hidden lg:block">
        <div className="admin-sidebar-inner sticky top-0 grid max-h-dvh gap-6 overflow-y-auto px-3 py-5">
          <div className="px-2">
            <Wordmark onRail />
          </div>
          <Nav collapsed={collapsed} />
          <Link to="/" target="_blank" rel="noreferrer" className="admin-shop-link flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold"><ExternalLink className="size-[18px] shrink-0" aria-hidden="true" /><span className="admin-nav-label">Open storefront</span></Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="admin-topbar sticky top-0 z-(--z-header) flex h-16 items-center gap-1 border-b border-border px-3 backdrop-blur-md sm:gap-2 sm:px-6">
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
        <main id="admin-content" tabIndex={-1} className="admin-main flex-1 px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8">
          <RouteErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent side="left" className="admin-rail-sheet w-[18rem]">
          <DrawerHeader>
            <DrawerTitle className="sr-only">Menu</DrawerTitle>
            <Wordmark onRail />
          </DrawerHeader>
          <DrawerBody className="px-3">
            <Nav onNavigate={() => setMenuOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
