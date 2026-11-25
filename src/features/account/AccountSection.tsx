import { useId, type ReactNode } from "react";
import { BookHeart, BookOpen, Heart, KeyRound, LayoutDashboard, LifeBuoy, MapPin, MessageSquareText, Package, RotateCcw, TicketPercent, UserPlus, UserRound } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useT } from "@/i18n";

const pageIcons = { orders: Package, returns: RotateCcw, coupons: TicketPercent, referrals: UserPlus, ebooks: BookOpen, wishlist: Heart, lists: BookHeart, reviews: MessageSquareText, profile: UserRound, security: KeyRound, addresses: MapPin, support: LifeBuoy };

/** Heading block for one account page (the page's h1) with an optional action on the right; the hub adds the avatar. */
export function AccountSection({ title, lead, action, avatar, children }: { title: string; lead?: ReactNode; action?: ReactNode; avatar?: string; children: ReactNode }) {
  const headingId = useId();
  const { dict } = useT();
  const segment = useLocation().pathname.split("/")[2];
  const Icon = pageIcons[segment as keyof typeof pageIcons] ?? LayoutDashboard;
  return (
    <section aria-labelledby={headingId} className="account-section grid gap-6">
      <div className="account-page-heading">
        {avatar ? <span className="account-avatar" aria-hidden="true">{avatar}</span> : null}
        <div className="grid min-w-0 flex-1 gap-1.5">
          <span className="account-eyebrow"><Icon aria-hidden="true" />{dict.account.eyebrow}</span>
          <h1 id={headingId} className="font-display text-[2.441rem] leading-[1.1]">
            {title}
          </h1>
          {lead ? <div className="text-muted-foreground">{lead}</div> : null}
        </div>
        {action ? <div className="account-heading-action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
