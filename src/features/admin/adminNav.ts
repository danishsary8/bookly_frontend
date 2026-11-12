import type { ComponentType } from "react";
import { ArrowLeftRight, BarChart3, Bot, BookCopy, BookMarked, Boxes, Building2, CreditCard, FolderTree, Gift, Headset, LayoutDashboard, Library, Mail, Megaphone, MessageSquareText, Package, PenTool, RotateCcw, ScrollText, ShieldCheck, Sparkles, Star, Tag, TicketPercent, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import type { StaffRole } from "@/api/endpoints/staff";

export type AdminNavItem = { to: string; label: string; Icon: ComponentType<{ className?: string }>; end?: boolean; roles?: StaffRole[] };
/** `tone` colours the group's marker and icons (admin.css `[data-tone]`), so each work area is easy to spot. */
export type AdminTone = "blue" | "teal" | "violet" | "amber" | "slate";
export type AdminNavGroup = { label: string; tone: AdminTone; items: AdminNavItem[] };

/*
 * Staff navigation, grouped by job: selling, looking after customers, marketing, the catalogue and admin.
 * Every page has its own icon. `roles` hides an item from staff the API would refuse anyway.
 */
export const adminNav: AdminNavGroup[] = [
  {
    label: "Overview",
    tone: "blue",
    items: [
      { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
      { to: "/admin/reports", label: "Reports", Icon: BarChart3, roles: ["admin"] },
    ],
  },
  {
    label: "Orders",
    tone: "blue",
    items: [
      { to: "/admin/orders", label: "Orders", Icon: Package },
      { to: "/admin/returns", label: "Returns", Icon: RotateCcw },
      { to: "/admin/customers", label: "Customers", Icon: Users },
    ],
  },
  {
    label: "Customer care",
    tone: "teal",
    items: [
      { to: "/admin/support", label: "Support", Icon: Headset },
      { to: "/admin/reviews", label: "Reviews", Icon: MessageSquareText },
      { to: "/admin/ratings", label: "Ratings", Icon: Star },
      { to: "/admin/assistant/knowledge", label: "Assistant knowledge", Icon: Bot },
    ],
  },
  {
    label: "Marketing",
    tone: "violet",
    items: [
      { to: "/admin/coupons", label: "Coupons", Icon: TicketPercent },
      { to: "/admin/offers", label: "Offers", Icon: Tag },
      { to: "/admin/promotions", label: "Promotions", Icon: Megaphone },
      { to: "/admin/rewards", label: "Rewards & payments", Icon: Wallet },
      { to: "/admin/gifts", label: "Gifts", Icon: Gift },
      { to: "/admin/reading-lists", label: "Staff picks", Icon: BookMarked },
      { to: "/admin/collections", label: "Collections", Icon: Sparkles },
    ],
  },
  {
    label: "Catalogue",
    tone: "amber",
    items: [
      { to: "/admin/books", label: "Books", Icon: BookCopy },
      { to: "/admin/stock", label: "Stock", Icon: Boxes },
      { to: "/admin/authors", label: "Authors", Icon: PenTool },
      { to: "/admin/categories", label: "Categories", Icon: FolderTree },
      { to: "/admin/publishers", label: "Publishers", Icon: Building2 },
      { to: "/admin/series", label: "Series", Icon: Library },
      { to: "/admin/trash", label: "Trash", Icon: Trash2, roles: ["admin"] },
    ],
  },
  {
    label: "Admin",
    tone: "slate",
    items: [
      { to: "/admin/newsletter", label: "Newsletter", Icon: Mail, roles: ["admin"] },
      { to: "/admin/gift-cards", label: "Gift cards", Icon: CreditCard, roles: ["admin"] },
      { to: "/admin/referrals", label: "Referrals", Icon: UserPlus, roles: ["admin"] },
      { to: "/admin/members", label: "Staff members", Icon: ShieldCheck, roles: ["admin"] },
      { to: "/admin/exchange-rates", label: "Exchange rate", Icon: ArrowLeftRight, roles: ["admin"] },
      { to: "/admin/audit-log", label: "Audit log", Icon: ScrollText, roles: ["admin"] },
    ],
  },
];

export const navFor = (role: StaffRole | undefined) =>
  adminNav
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role))) }))
    .filter((group) => group.items.length > 0);

/** The nav group a path belongs to (longest match wins, so /admin/orders/5 → Orders). */
export const groupFor = (pathname: string) => {
  let best: { group: AdminNavGroup; length: number } | undefined;
  for (const group of adminNav)
    for (const item of group.items) {
      const hit = item.end ? item.to === pathname : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (hit && (!best || item.to.length > best.length)) best = { group, length: item.to.length };
    }
  return best?.group;
};
