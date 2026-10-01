import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getAccessToken, getStoredUser } from "../lib/session";

const CustomerRoute = () => {
  const location = useLocation();
  const token = getAccessToken();
  const user = getStoredUser();

  if (!token || (user && user.role !== "customer")) {
    // Remember where they were headed (e.g. /checkout) so sign-in can send them back.
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
};

export default CustomerRoute;
