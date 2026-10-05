import { Navigate, useParams } from "react-router-dom";

/** V1's /superadmin pages → the matching /admin screen (old bookmarks keep working). */
const TO: Record<string, string> = {
  login: "/admin/login",
  orders: "/admin/orders",
  returns: "/admin/returns",
  books: "/admin/books",
  catalog: "/admin/books",
  promotions: "/admin/coupons",
  users: "/admin/customers",
};

export default function LegacyAdminRedirect() {
  const section = (useParams()["*"] ?? "").split("/")[0];
  return <Navigate to={TO[section] ?? "/admin"} replace />;
}
