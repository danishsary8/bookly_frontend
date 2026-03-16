import { Routes, Route } from 'react-router-dom'
import Home from '../page/client/Home'
import Browse from '../page/client/Browse'
import Favorites from '../page/client/Favorites'
import Cart from '../page/client/Cart'
import Authentication from '../page/client/Authentication'
import OtpVerification from '../page/client/OtpVerification'
import Dashboard from '../page/admin/Dashboard'
import AdminAuthentication from '../page/admin/AdminAuthentication'
import ProtectedRoute from './ProtectedRoute'
import ClientLayout from '../layouts/ClientLayout'
import AdminLayout from '../layouts/AdminLayout'
import NotFound from '../page/NotFound'
import Books from '../page/admin/Books'
import Users from '../page/admin/Users'
import Settings from '../page/admin/Settings'

const AppRoutes = () => {
    return (
        <Routes>
            {/* Client Routes */}
            <Route element={<ClientLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/favorites" element={<Favorites />} />
            </Route>

            {/* Auth Routes (No layout or specific layout) */}
            <Route path="/login" element={<Authentication />} />
            <Route path="/register" element={<Authentication />} />
            <Route path="/verify-otp" element={<OtpVerification />} />
            <Route path="/superadmin/login" element={<AdminAuthentication />} />

            {/* Admin Routes (Protected) */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route element={<AdminLayout />}>
                    <Route path="/superadmin" element={<Dashboard />} />
                    <Route path="/superadmin/books" element={<Books />} />
                    <Route path="/superadmin/users" element={<Users />} />
                    <Route path="/superadmin/settings" element={<Settings />} />
                </Route>
            </Route>
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    )
}

export default AppRoutes;
