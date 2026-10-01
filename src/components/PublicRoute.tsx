import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAccessToken, getStoredUser } from '../lib/session';

const PublicRoute = () => {
    const location = useLocation();
    const token = getAccessToken();
    const user = getStoredUser();
    const isAdminAuthPath = location.pathname.startsWith("/superadmin");

    if (!token) {
        return <Outlet />;
    }

    if (user?.role === "admin") {
        if (isAdminAuthPath) {
            return <Navigate to="/superadmin" replace />;
        }

        return <Outlet />;
    }

    if (isAdminAuthPath) {
        return <Navigate to="/" replace />;
    }

    return <Navigate to="/" replace />;
};

export default PublicRoute;
