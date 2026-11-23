import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import type { StaffRole } from "@/api/endpoints/staff";
import { safeNext } from "@/lib/forms";

export type Portal = StaffRole;

export const portalBase = (portal: Portal): "/admin" | "/staff" => (portal === "admin" ? "/admin" : "/staff");

export const portalLabel = (portal: Portal): "Admin" | "Staff" => (portal === "admin" ? "Admin" : "Staff");

export const otherPortal = (portal: Portal): Portal => (portal === "admin" ? "staff" : "admin");

export const portalFromPathname = (pathname: string): Portal =>
  pathname === "/staff" || pathname.startsWith("/staff/") ? "staff" : "admin";

export const isWorkspacePath = (pathname: string): boolean =>
  pathname === "/admin" ||
  pathname.startsWith("/admin/") ||
  pathname === "/staff" ||
  pathname.startsWith("/staff/");

/** Build a full URL inside the active portal: portalPath("staff", "orders/5") -> "/staff/orders/5". */
export const portalPath = (portal: Portal, subPath = ""): string => {
  const base = portalBase(portal);
  const clean = subPath.replace(/^\/+/, "");
  return clean ? `${base}/${clean}` : base;
};

/**
 * Rewrite an API-supplied "/admin/..." path to the active portal ("/staff/..." when in staff portal).
 * Leaves non-admin links untouched.
 */
export const rewriteAdminPath = (path: string, portal: Portal): string => {
  if (portal === "admin") return path;
  if (path === "/admin") return "/staff";
  if (path.startsWith("/admin/")) return `/staff/${path.slice("/admin/".length)}`;
  return path;
};

/** Safe post-login redirect target scoped strictly to the given portal, never back to an auth page. */
export const portalNext = (portal: Portal, next: string | null | undefined): string => {
  const base = portalBase(portal);
  const safe = safeNext(next, "");
  const authRe = new RegExp(`^\\${base}/(login|two-factor|reset-password)([/?#]|$)`);
  const portalRe = new RegExp(`^\\${base}([/?#]|$)`);
  return portalRe.test(safe) && !authRe.test(safe) ? safe : base;
};

/** Current portal derived from the browser route (/staff/* -> "staff", otherwise "admin"). */
export function usePortal(): Portal {
  const { pathname } = useLocation();
  return portalFromPathname(pathname);
}

/** Returns a helper that prefixes relative workspace paths with "/staff" or "/admin". */
export function usePortalPath() {
  const portal = usePortal();
  return useCallback((subPath = "") => portalPath(portal, subPath), [portal]);
}
