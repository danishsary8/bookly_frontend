import { Heart, KeyRound, LayoutDashboard, LogOut, MapPin, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { FrozenOutlet } from "@/components/motion/FrozenOutlet";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { useSignOut } from "@/components/shell/useSignOut";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * The account area's frame: a side navigation at ≥ 1024px, a horizontally
 * scrolling link strip on phones (links, not tabs: each section is its own page
 * with its own URL), and the section page beside/below it.
 */

const accountSections = [
  { to: "/account", label: "Overview", Icon: LayoutDashboard, end: true },
  { to: "/account/profile", label: "Profile", Icon: UserRound },
  { to: "/account/security", label: "Password", Icon: KeyRound },
  { to: "/account/addresses", label: "Addresses", Icon: MapPin },
  { to: "/account/wishlist", label: "Wishlist", Icon: Heart },
] as const;

export function AccountLayout() {
  const session = useSession<Customer>("customer");
  const signOut = useSignOut();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="container-shell pb-16 pt-6 sm:pt-8">
      <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
        <span className="h-px w-12 bg-current" aria-hidden="true" />
        Your account
      </p>
      <p className="mt-2 text-lg text-muted-foreground">{firstName ? `Signed in as ${session?.user?.email}` : " "}</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Account" className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 lg:mx-0 lg:grid lg:border-b-0 lg:px-0">
            {accountSections.map(({ to, label, Icon, ...rest }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={"end" in rest}
                  className={({ isActive }) =>
                    cn(
                      "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "text-primary after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-primary lg:bg-lapis-tint lg:after:hidden"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )
                  }
                >
                  <Icon className="hidden size-[18px] lg:block" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <Button variant="ghost" onClick={() => void signOut()} className="mt-4 hidden w-full justify-start gap-3 px-3 font-medium text-muted-foreground lg:flex">
            <LogOut aria-hidden="true" /> Sign out
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
