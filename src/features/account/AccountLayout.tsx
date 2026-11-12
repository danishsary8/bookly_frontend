import { BookOpen, Heart, KeyRound, LayoutDashboard, LogOut, MapPin, MessageSquareText, Package, RotateCcw, TicketPercent, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FrozenOutlet } from "@/components/motion/FrozenOutlet";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { useSignOut } from "@/components/shell/useSignOut";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { shopFeaturesQuery } from "@/api/endpoints/credit";

/*
 * The account area's frame (pages/account.md): on laptops a sidebar card with a lapis "library card" header
 * (initial, name, who is signed in) over the links; a side navigation at ≥ 1024px, a horizontally
 * scrolling link strip on phones (links, not tabs: each section is its own page
 * with its own URL), and the section page beside/below it.
 */

const accountSections = [
  { to: "/account", key: "overview", Icon: LayoutDashboard, end: true },
  { to: "/account/orders", key: "orders", Icon: Package },
  { to: "/account/ebooks", key: "ebooks", Icon: BookOpen },
  { to: "/account/returns", key: "returns", Icon: RotateCcw },
  { to: "/account/reviews", key: "reviews", Icon: MessageSquareText },
  { to: "/account/profile", key: "profile", Icon: UserRound },
  { to: "/account/security", key: "security", Icon: KeyRound },
  { to: "/account/addresses", key: "addresses", Icon: MapPin },
  { to: "/account/wishlist", key: "wishlist", Icon: Heart },
  { to: "/account/coupons", key: "coupons", Icon: TicketPercent },
  { to: "/account/lists", key: "readingLists", Icon: BookOpen },
  { to: "/account/support", key: "support", Icon: MessageSquareText },
  { to: "/account/gift-cards", key: "gifts", Icon: BookOpen },
  { to: "/account/referrals", key: "referrals", Icon: UserRound },
] as const;

export function AccountLayout() {
  const session = useSession<Customer>("customer");
  const flags = useQuery(shopFeaturesQuery());
  const signOut = useSignOut();
  const firstName = session?.user?.name?.split(" ")[0];
  const { pathname } = useLocation();
  const strip = useRef<HTMLUListElement>(null);
  const { dict } = useT();
  // Phones: fade the edge that has more links, so a cut-off word reads as "scroll for more" (Khmer labels are long).
  const [more, setMore] = useState({ left: false, right: false });
  const measure = () => {
    const list = strip.current;
    if (!list) return;
    setMore({ left: list.scrollLeft > 4, right: list.scrollLeft + list.clientWidth < list.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [dict]);

  // On phones the links scroll sideways; bring the current one into view (horizontally only,
  // so the page itself doesn't jump).
  useEffect(() => {
    const list = strip.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const left = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "instant" as ScrollBehavior });
    measure();
  }, [pathname]);

  return (
    <div className="container-shell pb-20 pt-6 sm:pt-8">
      {/* Phones: the eyebrow and who is signed in above the link strip (the sidebar card shows them on laptops). */}
      <div className="lg:hidden">
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
          <span className="h-px w-12 bg-current" aria-hidden="true" />
          {dict.account.eyebrow}
        </p>
        <p className="mt-2 text-muted-foreground">{firstName ? dict.account.signedInAs(session?.user?.email ?? session?.user?.phone ?? firstName) : " "}</p>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-0 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label={dict.account.nav} className="lg:shop-card lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-3">
          {/* Laptops: a library-card header (initials, name, who is signed in) on top of the links. */}
          <div className="relative mb-3 hidden items-center gap-3 overflow-hidden rounded-xl bg-lapis px-4 py-4 text-on-lapis lg:flex">
            <span className="pointer-events-none absolute -right-6 -top-10 size-28 rounded-full bg-[radial-gradient(closest-side,rgb(154_166_255/0.45),transparent)]" aria-hidden="true" />
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#F2C84B] font-display text-lg text-[#0E1335]" aria-hidden="true">
              {(session?.user?.name ?? "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="relative grid min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F2C84B]">{dict.account.eyebrow}</span>
              <span className="truncate font-semibold">{session?.user?.name}</span>
              <span className="truncate text-xs text-on-lapis-muted">{firstName ? dict.account.signedInAs(session?.user?.email ?? session?.user?.phone ?? firstName) : " "}</span>
            </span>
          </div>
          <div className="relative">
          <ul ref={strip} onScroll={measure} className="no-scrollbar relative -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 lg:mx-0 lg:grid lg:border-b-0 lg:px-0">
            {accountSections.filter(({ key }) => key === "gifts" ? flags.data?.gift_cards && session?.user.email !== "demo@bookly.test" : key === "referrals" ? flags.data?.referrals && session?.user.email_verified && session?.user.email !== "demo@bookly.test" : true).map(({ to, key, Icon, ...rest }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={"end" in rest}
                  className={({ isActive }) =>
                    cn(
                      "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "text-primary after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-primary lg:bg-lapis-tint lg:font-semibold lg:after:inset-x-auto lg:after:inset-y-2 lg:after:left-0 lg:after:block lg:after:h-auto lg:after:w-[3px] lg:after:rounded-full"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )
                  }
                >
                  <Icon className="hidden size-[18px] lg:block" aria-hidden="true" />
                  {key === "support" ? dict.support.title : key === "gifts" || key === "referrals" ? dict.credit[key] : dict.account[key]}
                </NavLink>
              </li>
            ))}
          </ul>
          {more.left ? <span data-testid="strip-fade-left" aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-4 w-10 bg-gradient-to-r from-background to-transparent lg:hidden" /> : null}
          {more.right ? <span data-testid="strip-fade-right" aria-hidden="true" className="pointer-events-none absolute inset-y-0 -right-4 w-10 bg-gradient-to-l from-background to-transparent lg:hidden" /> : null}
          </div>
          <Button variant="ghost" onClick={() => void signOut()} className="mt-2 hidden w-full justify-start gap-3 border-t border-border px-3 pt-2 font-medium text-muted-foreground lg:flex">
            <LogOut aria-hidden="true" /> {dict.account.signOut}
          </Button>
        </nav>

        <div className="min-w-0">
          {/* Frozen like the site outlet, so a page fading out keeps showing its own section. */}
          <FrozenOutlet />
        </div>
      </div>
    </div>
  );
}
