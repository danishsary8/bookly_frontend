import { Navigate, Outlet } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import authService from '../services/auth.service';
import type { User } from '../types/auth.types';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const token = Cookies.get('token');
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAdminPath = window.location.pathname.startsWith('/superadmin');
    const storedAdmin = authService.getStoredAdmin();

    useEffect(() => {
        const fetchUser = async () => {
            // Only fetch customer data if we are NOT on an admin path
            // Admin data is already persisted in localStorage for immediate use
            if (token && !isAdminPath) {
                try {
                    const userData = await authService.getCurrentUser();
                    setUser(userData);
                } catch (error) {
                    console.error('Failed to fetch user:', error);
                    Cookies.remove('token');
                }
            }
            setIsLoading(false);
        };
        fetchUser();
    }, [token, isAdminPath]);

    if (!token) {
        return <Navigate to={isAdminPath ? "/superadmin/login" : "/login"} replace />;
    }

    if (isAdminPath) {
        // Handle admin authorization using localStorage persistence
        if (!storedAdmin || storedAdmin.role !== 'admin') {
            return <Navigate to="/superadmin/login" replace />;
        }
        return <Outlet />;
    }

    // Handle client/user authorization
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role || '')) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
