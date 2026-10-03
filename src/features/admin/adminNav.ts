import type { ComponentType } from "react";
import { BookCopy, FolderTree, LayoutDashboard, Library, PenTool, Building2 } from "lucide-react";
import type { StaffRole } from "@/api/endpoints/staff";

export type AdminNavItem = { to: string; label: string; Icon: ComponentType<{ className?: string }>; end?: boolean; roles?: StaffRole[] };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/*
 * Admin navigation. Phase 9a ships Overview and Catalogue; Sales (orders, returns,
 * reviews, coupons, customers) and Admin (staff, exchange rates, audit log) are
 * added in 9b. `roles` hides an item from staff the API would refuse anyway.
 */
export const adminNav: AdminNavGroup[] = [
  { label: "Overview", items: [{ to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true }] },
  {
    label: "Catalogue",
    items: [
      { to: "/admin/books", label: "Books", Icon: BookCopy },
      { to: "/admin/authors", label: "Authors", Icon: PenTool },
      { to: "/admin/categories", label: "Categories", Icon: FolderTree },
      { to: "/admin/publishers", label: "Publishers", Icon: Building2 },
      { to: "/admin/series", label: "Series", Icon: Library },
    ],
  },
];

export const navFor = (role: StaffRole | undefined) =>
  adminNav
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role))) }))
    .filter((group) => group.items.length > 0);
