import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useStaff } from "@/features/admin/staffSession";
import { portalBase, portalNext, portalPath, type Portal } from "@/features/admin/portal";

/*
 * Route guards for /admin and /staff. A workspace member is only "in" once two-step
 * verification is on: the API answers 403 to every staff route until then, so a session
 * without it goes to the setup page. Redirects carry the wanted page as ?next=.
 *
 * When `portal` is specified ("admin" or "staff"), role separation is strictly enforced:
 * staff accounts are kept inside /staff/* and admin accounts are kept inside /admin/*.
 */

const withPortalNext = (portal: Portal, subPath: string, next: string) => {
  const base = portalBase(portal);
  const target = portalPath(portal, subPath);
  return next && next !== base ? `${target}?next=${encodeURIComponent(next)}` : target;
};

/** Signed-in workspace user with 2FA on, optionally restricted to a specific portal role. */
export function RequirePortal({ portal }: { portal: Portal }) {
  const session = useStaff();
  const { pathname, search } = useLocation();
  const here = pathname + search;
  if (!session) return <Navigate to={withPortalNext(portal, "login", here)} replace />;
  if (session.user.role !== portal) {
    const ownPortal: Portal = session.user.role === "admin" ? "admin" : "staff";
    if (!session.user.two_factor_enabled) return <Navigate to={portalPath(ownPortal, "two-factor")} replace />;
    return <Navigate to={portalBase(ownPortal)} replace />;
  }
  if (!session.user.two_factor_enabled) return <Navigate to={withPortalNext(portal, "two-factor", here)} replace />;
  return <Outlet />;
}

/** Signed-in staff/admin with 2FA on (backwards-compatible guard used by isolated route tests). */
export function RequireStaff({ portal }: { portal?: Portal } = {}) {
  const session = useStaff();
  const { pathname, search } = useLocation();
  const activePortal: Portal = portal ?? (pathname === "/staff" || pathname.startsWith("/staff/") ? "staff" : "admin");
  const here = pathname + search;
  if (!session) return <Navigate to={withPortalNext(activePortal, "login", here)} replace />;
  if (portal && session.user.role !== portal) {
    const ownPortal: Portal = session.user.role === "admin" ? "admin" : "staff";
    if (!session.user.two_factor_enabled) return <Navigate to={portalPath(ownPortal, "two-factor")} replace />;
    return <Navigate to={portalBase(ownPortal)} replace />;
  }
  if (!session.user.two_factor_enabled) return <Navigate to={withPortalNext(activePortal, "two-factor", here)} replace />;
  return <Outlet />;
}

/** Admin role only (members, exports, deleting); staff go to their dashboard instead. */
export function RequireAdminRole() {
  const session = useStaff();
  const { pathname } = useLocation();
  if (session?.user.role !== "admin") {
    return <Navigate to={pathname.startsWith("/staff") ? "/staff" : "/admin"} replace />;
  }
  return <Outlet />;
}

/** Sign-in and password reset: someone already fully signed in goes on to their own portal. */
export function StaffGuestOnly({ portal }: { portal?: Portal } = {}) {
  const session = useStaff();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  if (session?.user.two_factor_enabled) {
    const ownPortal: Portal = session.user.role === "admin" ? "admin" : "staff";
    const activePortal: Portal = portal ?? (pathname.startsWith("/staff") ? "staff" : "admin");
    if (portal && ownPortal !== activePortal) return <Navigate to={portalBase(ownPortal)} replace />;
    return <Navigate to={portalNext(ownPortal, params.get("next"))} replace />;
  }
  return <Outlet />;
}

/** 2FA setup: needs the setup-only session from sign-in; done once 2FA is on. */
export function RequireStaffSetup({ portal }: { portal?: Portal } = {}) {
  const session = useStaff();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const activePortal: Portal = portal ?? (pathname.startsWith("/staff") ? "staff" : "admin");
  if (!session) return <Navigate to={portalPath(activePortal, "login")} replace />;
  if (portal && session.user.role !== portal) {
    const ownPortal: Portal = session.user.role === "admin" ? "admin" : "staff";
    return <Navigate to={session.user.two_factor_enabled ? portalBase(ownPortal) : portalPath(ownPortal, "two-factor")} replace />;
  }
  if (session.user.two_factor_enabled) return <Navigate to={portalNext(activePortal, params.get("next"))} replace />;
  return <Outlet />;
}
