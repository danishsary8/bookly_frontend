import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { safeNext, withNext } from "@/lib/forms";

/*
 * Route guards for the customer area (V2 session). Each redirect carries the page
 * the visitor wanted as ?next=, and the auth pages send them back there.
 */

const here = (location: { pathname: string; search: string; hash: string }) => location.pathname + location.search + location.hash;

/** Signed-in customers only; others go to /login?next=… */
export function RequireCustomer() {
  const session = useSession<Customer>("customer");
  const location = useLocation();
  if (!session) return <Navigate to={withNext("/login", here(location))} replace />;
  return <Outlet />;
}

/** Signed in *and* email verified (the API requires it for cart, wishlist, checkout, orders). */
export function RequireVerified() {
  const session = useSession<Customer>("customer");
  const location = useLocation();
  if (!session) return <Navigate to={withNext("/login", here(location))} replace />;
  if (session.user?.email_verified === false) return <Navigate to={withNext("/verify-email", here(location))} replace />;
  return <Outlet />;
}

/** Sign in / register / password reset: a signed-in customer is sent on to ?next= (or Home). */
export function GuestOnly() {
  const session = useSession<Customer>("customer");
  const [params] = useSearchParams();
  if (session) return <Navigate to={safeNext(params.get("next"))} replace />;
  return <Outlet />;
}
