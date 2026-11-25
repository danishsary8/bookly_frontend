import "./account.css";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookHeart, BookOpen, ChevronRight, Heart, KeyRound, LifeBuoy, LogOut, MapPin, MessageSquareText, Package, RotateCcw, TicketPercent, UserPlus, UserRound, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { m } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { FrozenOutlet } from "@/components/motion/FrozenOutlet";
import { SignOutDialog } from "@/components/shell/SignOutDialog";
import { CountBadge } from "@/components/ui/badge";
import { useOrderNotifications } from "@/features/orders/orderNotifications";
import { useT, type Translations } from "@/i18n";

/*
 * The account area's frame (pages/account.md §1, redesign 2026-11-25): no sidebar. The Overview is the hub (identity,
 * latest order, shortcuts and every section as grouped tiles). Every other page opens with one slim bar: "← Your
 * account" back to the hub and pill tabs for the sibling pages of its group (Orders · Returns · Coupons …), which
 * scroll sideways on phones. Detail pages (an order, a return) keep only their own back link. Content is centred at a
 * reading width, so each page uses the space the sidebar used to take.
 */

type SectionKey = "overview" | "orders" | "returns" | "coupons" | "referrals" | "ebooks" | "wishlist" | "readingLists" | "reviews" | "profile" | "security" | "addresses" | "support";
type Section = { to: string; key: SectionKey; Icon: LucideIcon; end?: boolean };
type GroupKey = keyof Translations["accountNav"]["groups"];

const groups: { key: GroupKey; sections: Section[] }[] = [
  {
    key: "shopping",
    sections: [
      { to: "/account/orders", key: "orders", Icon: Package },
      { to: "/account/returns", key: "returns", Icon: RotateCcw },
      { to: "/account/coupons", key: "coupons", Icon: TicketPercent },
      { to: "/account/referrals", key: "referrals", Icon: UserPlus },
    ],
  },
  {
    key: "library",
    sections: [
      { to: "/account/ebooks", key: "ebooks", Icon: BookOpen },
      { to: "/account/wishlist", key: "wishlist", Icon: Heart },
      { to: "/account/lists", key: "readingLists", Icon: BookHeart },
      { to: "/account/reviews", key: "reviews", Icon: MessageSquareText },
    ],
  },
  {
    key: "settings",
    sections: [
      { to: "/account/profile", key: "profile", Icon: UserRound },
      { to: "/account/security", key: "security", Icon: KeyRound },
      { to: "/account/addresses", key: "addresses", Icon: MapPin },
    ],
  },
  { key: "help", sections: [{ to: "/account/support", key: "support", Icon: LifeBuoy }] },
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

/** Sub-page bar: back to the hub, then the sibling pages of this group as pill tabs. */
function SectionBar({ group, visible, unreadOrders }: { group: (typeof groups)[number]; visible: (key: SectionKey) => boolean; unreadOrders: number }) {
  const { dict } = useT();
  const { pathname } = useLocation();
  const sections = group.sections.filter((s) => visible(s.key));
  const tabs = useRef<HTMLUListElement>(null);
  // Phones: the tab row scrolls sideways, so bring the current page's tab into view (without moving the page).
  useEffect(() => {
    const row = tabs.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = Math.max(0, active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2);
  }, [pathname]);
  return (
    <nav aria-label={dict.account.nav} className="account-bar">
      <NavLink to="/account" end className="account-bar-back">
        <ArrowLeft aria-hidden="true" />
        {dict.account.eyebrow}
      </NavLink>
      {sections.length > 1 ? (
        <ul ref={tabs} className="account-tabs no-scrollbar" aria-label={dict.accountNav.groups[group.key]}>
          {sections.map(({ to, key, Icon }) => {
            const badge = key === "orders" ? unreadOrders : 0;
            return (
              <li key={to}>
                <NavLink to={to} className="account-tab">
                  <Icon aria-hidden="true" />
                  <span>{label(dict, key)}</span>
                  <CountBadge count={badge} className="badge-pop" aria-hidden="true" />
                  {badge > 0 ? <span className="sr-only"> ({dict.shell.orderUpdates(badge)})</span> : null}
                </NavLink>
              </li>
            );
          })}
        </ul>
      ) : null}
    </nav>
  );
}

export function AccountLayout() {
  const { unreadCount: unreadOrders } = useOrderNotifications();
  const { pathname } = useLocation();
  const visible = useVisibleSections();
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const isHub = parts.length === 1;
  // Detail pages (an order, a return, a request form) carry their own back link, so they get no section bar.
  const isDetail = parts.length > 2;
  const group = groups.find((g) => g.sections.some((s) => pathname.startsWith(s.to)));
  const current = group?.sections.find((s) => pathname.startsWith(s.to));

  return (
    <div className="account-area container-shell pb-20 pt-5 sm:pt-8 short:pt-4" data-account-page={isHub ? "overview" : (current?.key ?? "other")} data-account-hub={isHub || undefined}>
      <div className="account-frame">
        {!isHub && !isDetail && group ? <SectionBar group={group} visible={visible} unreadOrders={unreadOrders} /> : null}
        <div className="account-content min-w-0">
          {/* Frozen like the site outlet, so a page fading out keeps showing its own section. */}
          <m.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] } }}>
            <FrozenOutlet />
          </m.div>
        </div>
      </div>
    </div>
  );
}

/**
 * The hub's section directory (every size): the four groups as cards, each a list of rows with an icon, a one-line
 * and a chevron (Sign out is AccountSignOut, at the end of the hub).
 */
export function AccountHubSections() {
  const { unreadCount: unreadOrders } = useOrderNotifications();
  const visible = useVisibleSections();
  const { dict } = useT();
  return (
    <section aria-labelledby="account-directory" className="grid gap-4">
      <h2 id="account-directory" className="account-hub-heading">{dict.accountNav.directory}</h2>
      <div className="account-directory">
        {groups.map((group) => {
          const sections = group.sections.filter((s) => visible(s.key));
          if (sections.length === 0) return null;
          const id = `account-group-${group.key}`;
          return (
            <div key={group.key} className="account-group">
              <p id={id} className="account-group-title">{dict.accountNav.groups[group.key]}</p>
              <ul aria-labelledby={id}>
                {sections.map(({ to, key, Icon }) => {
                  const badge = key === "orders" ? unreadOrders : 0;
                  return (
                    <li key={to}>
                      <NavLink to={to} className="account-row">
                        <span className="account-row-icon" aria-hidden="true"><Icon /></span>
                        <span className="min-w-0 flex-1 truncate">{label(dict, key)}</span>
                        <CountBadge count={badge} className="badge-pop shrink-0" aria-hidden="true" />
                        {badge > 0 ? <span className="sr-only"> ({dict.shell.orderUpdates(badge)})</span> : null}
                        <ChevronRight className="account-row-chevron" aria-hidden="true" />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The hub's last line: Sign out, where people look for it (after everything else on the page). */
export function AccountSignOut() {
  const session = useSession<Customer>("customer");
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { dict } = useT();
  return (
    <div className="account-signout-row">
      <button type="button" onClick={() => setConfirmSignOut(true)} className="account-signout">
        <LogOut aria-hidden="true" /> {dict.account.signOut}
      </button>
      <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} user={session?.user} />
    </div>
  );
}
