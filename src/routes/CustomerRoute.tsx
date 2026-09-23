import { Navigate, Outlet } from "react-router-dom";

import { getAccessToken, getStoredUser } from "../lib/session";

const CustomerRoute = () => {
  const token = getAccessToken();
  const user = getStoredUser();

  if (!token || (user && user.role !== "customer")) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default CustomerRoute;
