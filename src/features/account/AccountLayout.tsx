import "./account.css";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  BookMarked,
  BookOpenText,
  ChevronRight,
  CircleUserRound,
  Gift,
  Headphones,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { m } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { accountQueries } from "@/api/endpoints/account";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { rewardQueries } from "@/api/endpoints/rewards";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { FrozenOutlet } from "@/components/motion/FrozenOutlet";
import { PreferencesMenu } from "@/components/shell/PreferencesMenu";
import { SignOutDialog } from "@/components/shell/SignOutDialog";
import { useCartCount } from "@/components/shell/useCartCount";
import { CountBadge } from "@/components/ui/badge";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { isVerified } from "@/features/auth/verification";
import { useOrderNotifications } from "@/features/orders/orderNotifications";
import { useT, type Translations } from "@/i18n";
import { openShellPanel } from "@/stores/shell";

/*
 * Production Account shell:
 * - Desktop (>=1024px): Unified elevated split-pane card — persistent left sidebar with user identity,
 *   clean grouped vertical navigation, live badges, and Sign out; clean right content pane.
 * - Mobile (<1024px): Clean native-app style header (circular Back button + centered page title +
 *   compact Cart & Preferences) over a calm canvas with iOS-style grouped white rounded list cards.
 */

type SectionKey =
  | "overview"
  | "orders"
  | "returns"
  | "coupons"
  | "referrals"
  | "ebooks"
  | "wishlist"
  | "readingLists"
  | "reviews"
  | "profile"
  | "security"
  | "addresses"
  | "support";
type Section = { to: string; key: SectionKey; Icon: LucideIcon; end?: boolean };
type GroupKey = keyof Translations["accountNav"]["groups"];

const groups: { key: GroupKey; sections: Section[] }[] = [
  {
    key: "shopping",
    sections: [
      { to: "/account/orders", key: "orders", Icon: PackageCheck },
      { to: "/account/returns", key: "returns", Icon: RotateCcw },
      { to: "/account/coupons", key: "coupons", Icon: BadgePercent },
      { to: "/account/referrals", key: "referrals", Icon: Gift },
    ],
  },
  {
    key: "library",
    sections: [
      { to: "/account/ebooks", key: "ebooks", Icon: BookOpenText },
      { to: "/account/wishlist", key: "wishlist", Icon: Heart },
      { to: "/account/lists", key: "readingLists", Icon: BookMarked },
      { to: "/account/reviews", key: "reviews", Icon: Star },
    ],
  },
  {
    key: "settings",
    sections: [
      { to: "/account/profile", key: "profile", Icon: CircleUserRound },
      { to: "/account/security", key: "security", Icon: ShieldCheck },
      { to: "/account/addresses", key: "addresses", Icon: MapPin },
      { to: "/account/support", key: "support", Icon: Headphones },
    ],
  },
];

function label(dict: Translations, key: SectionKey) {
  return key === "support" ? dict.support.title : key === "referrals" ? dict.credit.referrals : dict.account[key];
}

/** Which sections this customer sees (referrals only when the shop runs them, for verified, non-demo accounts). */
function useVisibleSections() {
  const session = useSession<Customer>("customer");
  const flags = useQuery(shopFeaturesQuery());
  const user = session?.user;
  const demo = user?.email === "demo@bookly.test";
  return (key: SectionKey) => (key === "referrals" ? Boolean(flags.data?.referrals && user?.email_verified) && !demo : true);
}

/** Inline skeleton shown inside the right content pane while a lazy sub-page chunk loads. */
function AccountContentFallback() {
  const { dict } = useT();
  return (
    <SkeletonGroup label={dict.shell.loadingPage} className="account-section">
      <div className="account-pane-header">
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-7 w-44 max-w-full rounded-lg" />
          <Skeleton className="h-3.5 w-72 max-w-full rounded-full" />
        </div>
      </div>
      <div className="account-pane-body">
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-4/5 rounded-full" />
          <Skeleton className="h-4 w-3/5 rounded-full" />
        </div>
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** Clean sticky top bar: minimal utility chrome on desktop; centered-title native header on mobile. */
function AccountTopBar({ isHub, mobileTitle }: { isHub: boolean; mobileTitle: string }) {
  const { dict } = useT();
  const { pathname } = useLocation();
  const cartCount = useCartCount();
  const headerRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const backTo = isHub ? "/" : "/account";
  const backLabel = isHub ? dict.accountNav.backToShop : dict.accountNav.backToAccount;

  useEffect(() => {
    let frame = 0;
    let lastY = Math.max(0, window.scrollY);
    const update = () => {
      frame = 0;
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = Math.max(0, Math.min(window.scrollY, maxY));
      const delta = y - lastY;
      lastY = y;
      const menuOpen = headerRef.current?.querySelector('[data-state="open"], [aria-expanded="true"]');
      if (menuOpen || y <= 4 || maxY < 48) {
        setHidden(false);
        return;
      }
      if (delta >= 4) setHidden(true);
      else if (delta <= -4) setHidden(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(() => {
      frame = 0;
      lastY = Math.max(0, window.scrollY);
      setHidden(false);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <header ref={headerRef} onFocusCapture={() => setHidden(false)} data-scroll-hidden={hidden || undefined} className="account-topbar">
      <div className="container-shell">
        <div className="account-topbar-inner">
          <div className="account-topbar-left">
            <Link to={backTo} aria-label={backLabel} className="account-back-btn">
              <span className="account-back-icon" aria-hidden="true">
                <ArrowLeft />
              </span>
              <span className="account-back-text truncate">{backLabel}</span>
            </Link>
            <Link to="/" aria-label={dict.navLinks.homeLabel} className="account-wordmark-desktop">
              Bookly
            </Link>
          </div>

          <div className="account-topbar-center">
            <span className="account-mobile-title truncate">{mobileTitle}</span>
          </div>

          <div className="account-topbar-right">
            <Link to="/" className="account-topbar-utility account-topbar-shop" aria-label={dict.accountNav.backToShop}>
              <Store aria-hidden="true" />
              <span>{dict.accountNav.shopLink}</span>
            </Link>
            <PreferencesMenu compact className="account-pref-trigger h-10 bg-card" />
            <button
              type="button"
              onClick={() => openShellPanel("cart")}
              aria-label={cartCount > 0 ? dict.nav.cartCount(cartCount) : dict.nav.cart}
              data-cart-target=""
              className="account-topbar-utility account-topbar-cart"
            >
              <ShoppingBag aria-hidden="true" />
              <CountBadge count={cartCount} className="badge-pop absolute -right-1 -top-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Desktop persistent left sidebar (mirrors clean SaaS / production account settings layout). */
function AccountSidebar({
  customer,
  visible,
  unreadOrders,
  usableCoupons,
}: {
  customer?: Customer | null;
  visible: (key: SectionKey) => boolean;
  unreadOrders: number;
  usableCoupons: number;
}) {
  const { dict } = useT();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const initial = (customer?.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="account-sidebar" aria-label={dict.account.nav}>
      {/* Top identity block */}
      <Link to="/account/profile" className="account-sidebar-user">
        <span className="account-avatar-circle" aria-hidden="true">
          {initial}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-[14.5px] font-semibold text-foreground">{customer?.name ?? dict.account.eyebrow}</span>
          {customer?.email ? <span className="truncate text-xs text-muted-foreground">{customer.email}</span> : null}
        </span>
      </Link>

      {/* Navigation groups */}
      <nav className="account-sidebar-nav" aria-label={dict.account.nav}>
        <div className="account-sidebar-group">
          <ul>
            <li>
              <NavLink to="/account" end className="account-sidebar-link">
                <LayoutDashboard aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{dict.account.overview}</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {groups.map((group) => {
          const sections = group.sections.filter((s) => visible(s.key));
          if (sections.length === 0) return null;
          return (
            <div key={group.key} className="account-sidebar-group" data-group={group.key}>
              <p className="account-sidebar-label">{dict.accountNav.groups[group.key]}</p>
              <ul>
                {sections.map(({ to, key, Icon }) => {
                  const badge = key === "orders" ? unreadOrders : 0;
                  const couponCount = key === "coupons" ? usableCoupons : 0;
                  return (
                    <li key={to}>
                      <NavLink to={to} className="account-sidebar-link">
                        <Icon aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{label(dict, key)}</span>
                        <CountBadge count={badge} className="badge-pop shrink-0" aria-hidden="true" />
                        {badge > 0 ? <span className="sr-only"> ({dict.shell.orderUpdates(badge)})</span> : null}
                        {couponCount > 0 ? <span className="account-sidebar-pill">{couponCount}</span> : null}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer sign out */}
      <div className="account-sidebar-footer">
        <button type="button" onClick={() => setConfirmSignOut(true)} className="account-sidebar-signout">
          <LogOut aria-hidden="true" />
          <span>{dict.account.signOut}</span>
        </button>
        <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} user={customer ?? undefined} />
      </div>
    </aside>
  );
}

export function AccountLayout() {
  const { dict } = useT();
  const session = useSession<Customer>("customer");
  const me = useQuery(accountQueries.me());
  const customer = me.data ?? session?.user;
  const verified = !session || isVerified(session.user);
  const { unreadCount: unreadOrders } = useOrderNotifications();
  const coupons = useQuery({ ...rewardQueries.myCoupons(), enabled: verified });
  const usableCoupons = (coupons.data ?? []).filter((c) => c.is_usable).length;
  const { pathname } = useLocation();
  const visible = useVisibleSections();
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const isHub = parts.length === 1;
  const group = groups.find((g) => g.sections.some((s) => pathname.startsWith(s.to)));
  const current = group?.sections.find((s) => pathname.startsWith(s.to));
  const mobileTitle = isHub ? dict.account.eyebrow : current ? label(dict, current.key) : dict.account.eyebrow;

  // Avoid double animation on initial entry into /account (PageTransition already animates entry);
  // only play a gentle, fast opacity fade when switching between account sub-pages.
  const [entryPath] = useState(pathname);

  return (
    <div className="account-shell">
      <AccountTopBar isHub={isHub} mobileTitle={mobileTitle} />
      <div
        className="account-area container-shell pb-20 pt-3 sm:pt-5 lg:pt-7"
        data-account-page={isHub ? "overview" : (current?.key ?? "other")}
        data-account-hub={isHub || undefined}
      >
        <div className="account-workspace">
          <AccountSidebar
            customer={customer}
            visible={visible}
            unreadOrders={unreadOrders}
            usableCoupons={usableCoupons}
          />
          <div className="account-main min-w-0">
            <Suspense fallback={<AccountContentFallback />}>
              <m.div
                key={pathname}
                initial={pathname === entryPath ? false : { opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.16, ease: "easeOut" } }}
              >
                <FrozenOutlet />
              </m.div>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-first grouped white list cards (iOS / consumer app Settings hub pattern).
 * On desktop (>=1024px) the persistent left sidebar replaces this list cleanly.
 */
export function AccountHubSections() {
  const session = useSession<Customer>("customer");
  const verified = !session || isVerified(session.user);
  const { unreadCount: unreadOrders } = useOrderNotifications();
  const coupons = useQuery({ ...rewardQueries.myCoupons(), enabled: verified });
  const usableCoupons = (coupons.data ?? []).filter((c) => c.is_usable).length;
  const visible = useVisibleSections();
  const { dict } = useT();

  return (
    <section aria-label={dict.accountNav.directory} className="account-mobile-directory">
      {groups.map((group) => {
        const sections = group.sections.filter((s) => visible(s.key));
        if (sections.length === 0) return null;
        const id = `account-group-${group.key}`;
        return (
          <div key={group.key} className="account-list-card" data-group={group.key}>
            <p id={id} className="account-list-heading">
              {dict.accountNav.groups[group.key]}
            </p>
            <ul aria-labelledby={id} className="account-list-items">
              {sections.map(({ to, key, Icon }) => {
                const badge = key === "orders" ? unreadOrders : 0;
                const couponCount = key === "coupons" ? usableCoupons : 0;
                return (
                  <li key={to}>
                    <NavLink to={to} className="account-list-row">
                      <span className="account-list-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{label(dict, key)}</span>
                      <CountBadge count={badge} className="badge-pop shrink-0" aria-hidden="true" />
                      {badge > 0 ? <span className="sr-only"> ({dict.shell.orderUpdates(badge)})</span> : null}
                      {couponCount > 0 ? <span className="account-list-pill">{couponCount}</span> : null}
                      <ChevronRight className="account-list-chevron" aria-hidden="true" />
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

/** Mobile bottom Sign out list card (desktop uses the left sidebar footer). */
export function AccountSignOut() {
  const session = useSession<Customer>("customer");
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { dict } = useT();
  return (
    <div className="account-mobile-signout">
      <button type="button" onClick={() => setConfirmSignOut(true)} className="account-list-signout">
        <span className="account-list-signout-icon" aria-hidden="true">
          <LogOut />
        </span>
        <span className="flex-1 text-left">{dict.account.signOut}</span>
        <ChevronRight className="account-list-chevron" aria-hidden="true" />
      </button>
      <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} user={session?.user} />
    </div>
  );
}
