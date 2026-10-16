import type { ComponentType } from "react";
import { ArrowLeftRight, BarChart3, BookCopy, Boxes, Building2, FolderTree, LayoutDashboard, Library, Mail, MessageSquareText, Package, PenTool, RotateCcw, ScrollText, ShieldCheck, TicketPercent, Trash2, Users } from "lucide-react";
import type { StaffRole } from "@/api/endpoints/staff";

export type AdminNavItem = { to: string; label: string; Icon: ComponentType<{ className?: string }>; end?: boolean; roles?: StaffRole[] };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/*
 * Admin navigation, grouped. `roles` hides an item from staff the API would refuse anyway.
 */
export const adminNav: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
      { to: "/admin/reports", label: "Reports", Icon: BarChart3, roles: ["admin"] },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/admin/orders", label: "Orders", Icon: Package },
      { to: "/admin/returns", label: "Returns", Icon: RotateCcw },
      { to: "/admin/reviews", label: "Reviews", Icon: MessageSquareText },
      { to: "/admin/coupons", label: "Coupons", Icon: TicketPercent },
      { to: "/admin/customers", label: "Customers", Icon: Users },
    ],
  },
  {
    label: "Catalogue",
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
    items: [
      { to: "/admin/newsletter", label: "Newsletter", Icon: Mail, roles: ["admin"] },
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
