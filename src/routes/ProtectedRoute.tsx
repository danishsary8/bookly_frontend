import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import authService from "../services/auth.service";
import { getAccessToken, getStoredUser } from "../lib/session";
import type { User } from "../types/auth.types";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const token = getAccessToken();
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const isAdminPath = window.location.pathname.startsWith("/superadmin");

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  if (!token) {
    return <Navigate to={isAdminPath ? "/superadmin/login" : "/login"} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={isAdminPath ? "/superadmin/login" : "/login"} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/superadmin" : "/"} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
