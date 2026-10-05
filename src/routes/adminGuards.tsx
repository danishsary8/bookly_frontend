import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useStaff } from "@/features/admin/staffSession";
import { adminNext } from "@/features/admin/adminNext";

/*
 * Route guards for /admin. A staff member is only "in" once two-step verification
 * is on: the API answers 403 to every staff route until then, so a session without
 * it goes to the setup page. Redirects carry the wanted page as ?next=.
 */

const withAdminNext = (path: string, next: string) => (next && next !== "/admin" ? `${path}?next=${encodeURIComponent(next)}` : path);

/** Signed-in staff with 2FA on; others go to sign-in or to 2FA setup. */
export function RequireStaff() {
  const session = useStaff();
  const { pathname, search } = useLocation();
  const here = pathname + search;
  if (!session) return <Navigate to={withAdminNext("/admin/login", here)} replace />;
  if (!session.user.two_factor_enabled) return <Navigate to={withAdminNext("/admin/two-factor", here)} replace />;
  return <Outlet />;
}

/** Admin role only (members, exports, deleting); staff see the dashboard instead. */
export function RequireAdminRole() {
  const session = useStaff();
  if (session?.user.role !== "admin") return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Sign-in and password reset: someone already fully signed in goes on to ?next=. */
export function StaffGuestOnly() {
  const session = useStaff();
  const [params] = useSearchParams();
  if (session?.user.two_factor_enabled) return <Navigate to={adminNext(params.get("next"))} replace />;
  return <Outlet />;
}

/** 2FA setup: needs the setup-only session from sign-in; done once 2FA is on. */
export function RequireStaffSetup() {
  const session = useStaff();
  const [params] = useSearchParams();
  if (!session) return <Navigate to="/admin/login" replace />;
  if (session.user.two_factor_enabled) return <Navigate to={adminNext(params.get("next"))} replace />;
  return <Outlet />;
}
