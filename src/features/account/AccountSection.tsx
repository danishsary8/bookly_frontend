import { useId, type ReactNode } from "react";
import { BookHeart, BookOpen, Gift, Heart, KeyRound, LayoutDashboard, LifeBuoy, MapPin, MessageSquareText, Package, RotateCcw, TicketPercent, UserPlus, UserRound } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useT } from "@/i18n";

const pageIcons = { orders: Package, returns: RotateCcw, coupons: TicketPercent, "gift-cards": Gift, referrals: UserPlus, ebooks: BookOpen, wishlist: Heart, lists: BookHeart, reviews: MessageSquareText, profile: UserRound, security: KeyRound, addresses: MapPin, support: LifeBuoy };

/** Heading block for one account page (the page's h1) with an optional action on the right. */
export function AccountSection({ title, lead, action, children }: { title: string; lead?: ReactNode; action?: ReactNode; children: ReactNode }) {
  const headingId = useId();
  const { dict } = useT();
  const segment = useLocation().pathname.split("/")[2];
  const Icon = pageIcons[segment as keyof typeof pageIcons] ?? LayoutDashboard;
  return (
    <section aria-labelledby={headingId} className="account-section grid gap-6">
      <div className="account-page-heading">
        <div className="grid gap-1.5">
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
