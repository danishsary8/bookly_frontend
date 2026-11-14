import "./account.css";
import { useId } from "react";
import { ArrowUpRight, BookHeart, BookOpen, ChevronDown, Gift, Heart, KeyRound, LayoutDashboard, LifeBuoy, LogOut, MapPin, MessageSquareText, Package, RotateCcw, TicketPercent, UserPlus, UserRound, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { FrozenOutlet } from "@/components/motion/FrozenOutlet";
import { useSignOut } from "@/components/shell/useSignOut";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT, type Translations } from "@/i18n";

/*
 * The account area's frame (pages/account.md §1). Laptops: one sidebar card with a lapis "library card" (initial,
 * name, who is signed in) over the links in four labelled groups (shopping, library, settings, help) and Sign out.
 * Phones: a compact menu, one button naming the current section that opens the same grouped links, so a long row of
 * Khmer labels never has to scroll sideways. Each section is its own page with its own URL.
 */

type SectionKey = "overview" | "orders" | "returns" | "coupons" | "gifts" | "referrals" | "ebooks" | "wishlist" | "readingLists" | "reviews" | "profile" | "security" | "addresses" | "support";
type Section = { to: string; key: SectionKey; Icon: LucideIcon; end?: boolean };

const groups: { key: keyof Translations["accountNav"]["groups"]; sections: Section[] }[] = [
  {
    key: "shopping",
    sections: [
      { to: "/account", key: "overview", Icon: LayoutDashboard, end: true },
      { to: "/account/orders", key: "orders", Icon: Package },
      { to: "/account/returns", key: "returns", Icon: RotateCcw },
      { to: "/account/coupons", key: "coupons", Icon: TicketPercent },
      { to: "/account/gift-cards", key: "gifts", Icon: Gift },
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
  return key === "support" ? dict.support.title : key === "gifts" || key === "referrals" ? dict.credit[key] : dict.account[key];
}

function SectionLinks({ visible, onNavigate }: { visible: (key: SectionKey) => boolean; onNavigate?: () => void }) {
  const { dict } = useT();
  const instanceId = useId();
  return (
    <div className="grid gap-4">
      {groups.map((group) => {
        const sections = group.sections.filter((s) => visible(s.key));
        if (sections.length === 0) return null;
        const id = `account-nav-${instanceId}-${group.key}`;
        return (
          <div key={group.key} className="grid gap-0.5">
            <p id={id} className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {dict.accountNav.groups[group.key]}
            </p>
            <ul aria-labelledby={id} className="grid gap-0.5">
              {sections.map(({ to, key, Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "account-nav-link relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-lapis-tint font-semibold text-primary after:absolute after:inset-y-2 after:left-0 after:w-[3px] after:rounded-full after:bg-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )
                    }
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {label(dict, key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function AccountLayout() {
  const session = useSession<Customer>("customer");
  const flags = useQuery(shopFeaturesQuery());
  const signOut = useSignOut();
  const { pathname } = useLocation();
  const { dict } = useT();
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0];
  const who = firstName ? dict.account.signedInAs(user?.email ?? user?.phone ?? firstName) : " ";
  const demo = user?.email === "demo@bookly.test";
  const visible = (key: SectionKey) =>
    key === "gifts" ? Boolean(flags.data?.gift_cards) && !demo : key === "referrals" ? Boolean(flags.data?.referrals && user?.email_verified) && !demo : true;
  const current = groups.flatMap((g) => g.sections).find((s) => (s.end ? pathname === s.to : pathname.startsWith(s.to))) ?? groups[0].sections[0];
  const CurrentIcon = current.Icon;

  return (
    <div className="account-area container-shell pb-20 pt-6 sm:pt-8 short:pt-4" data-account-page={current.key}>
      <div className="account-frame">
        {/* Laptops: the sidebar card. */}
        <nav aria-label={dict.account.nav} className="account-sidebar shop-card sticky top-[calc(var(--header-h)+1.5rem)] hidden max-h-[calc(100dvh-var(--header-h)-3rem)] self-start overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-3 lg:block">
          <div className="account-identity">
            <span className="pointer-events-none absolute -right-6 -top-10 size-28 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--on-lapis-muted)_45%,transparent),transparent)]" aria-hidden="true" />
            <span className="account-avatar" aria-hidden="true">
              {(user?.name ?? "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="relative grid min-w-0">
              <span className="account-identity-eyebrow">{dict.account.eyebrow}</span>
              <span className="truncate font-semibold">{user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">{who}</span>
            </span>
          </div>
          <SectionLinks visible={visible} />
          <NavLink to="/books" className="account-back-to-shop"><BookOpen aria-hidden="true" />{dict.account.browseBooks}<ArrowUpRight aria-hidden="true" /></NavLink>
          <Button variant="ghost" onClick={() => void signOut()} className="mt-3 w-full justify-start gap-3 border-t border-border px-3 pt-2 font-medium text-muted-foreground">
            <LogOut aria-hidden="true" /> {dict.account.signOut}
          </Button>
        </nav>

        {/* Phones and tablets: one compact menu. Keyed by the path so it closes after choosing a section. */}
        <nav aria-label={dict.account.nav} className="lg:hidden">
          <p className="mb-2 truncate text-sm text-muted-foreground">{who}</p>
          <details key={pathname} className="group shop-card rounded-2xl border border-border bg-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
                <CurrentIcon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{dict.account.eyebrow}</span>
                <span className="block truncate font-semibold">{label(dict, current.key)}</span>
              </span>
              <span className="text-sm font-semibold text-primary">{dict.accountNav.menu}</span>
              <ChevronDown className="size-5 text-primary transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <div className="border-t border-border p-3">
              <SectionLinks visible={visible} />
              <Button variant="ghost" onClick={() => void signOut()} className="mt-3 w-full justify-start gap-3 border-t border-border px-3 pt-2 font-medium text-muted-foreground">
                <LogOut aria-hidden="true" /> {dict.account.signOut}
              </Button>
            </div>
          </details>
        </nav>

        <div className="account-content min-w-0">
          {/* Frozen like the site outlet, so a page fading out keeps showing its own section. */}
          <FrozenOutlet />
        </div>
      </div>
    </div>
  );
}
