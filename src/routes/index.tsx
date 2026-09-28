import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Loading from "../components/ui/loading";
import PublicRoute from "../components/PublicRoute";
import AdminLayout from "../layouts/AdminLayout";
import ClientLayout from "../layouts/ClientLayout";
import ProtectedRoute from "./ProtectedRoute";
import CustomerRoute from "./CustomerRoute";

const Home = lazy(() => import("../page/client/Home"));
const Browse = lazy(() => import("../page/client/Browse"));
const Favorites = lazy(() => import("../page/client/Favorites"));
const Cart = lazy(() => import("../page/client/Cart"));
const Authentication = lazy(() => import("../page/client/Authentication"));
const OtpVerification = lazy(() => import("../page/client/OtpVerification"));
const ForgotPassword = lazy(() => import("../page/client/ForgotPassword"));
const ResetPassword = lazy(() => import("../page/client/ResetPassword"));
const loadBookDetail = () => import("../page/client/BookDetail");
const BookDetail = lazy(loadBookDetail);
const Checkout = lazy(() => import("../page/client/Checkout"));
const Profile = lazy(() => import("../page/client/Profile"));
const CustomerOrders = lazy(() => import("../page/client/Orders"));
const CustomerOrderDetail = lazy(() => import("../page/client/OrderDetail"));
const Dashboard = lazy(() => import("../page/admin/Dashboard"));
const Catalog = lazy(() => import("../page/admin/Catalog"));
const Promotions = lazy(() => import("../page/admin/Promotions"));
const Orders = lazy(() => import("../page/admin/Orders"));
const Returns = lazy(() => import("../page/admin/Returns"));
const Books = lazy(() => import("../page/admin/Books"));
const Users = lazy(() => import("../page/admin/Users"));
const Settings = lazy(() => import("../page/admin/Settings"));
const AdminAuthentication = lazy(() => import("../page/admin/AdminAuthentication"));
const NotFound = lazy(() => import("../page/NotFound"));

const AppRoutes = () => {
  // Prefetch the book page while idle so the cover morph never waits on a lazy chunk.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => void loadBookDetail());
  }, []);

  return (
    <Suspense fallback={<div className="section-wrap py-10"><Loading /></div>}>
      <Routes>
        <Route element={<ClientLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="*" element={<NotFound />} />
          <Route element={<CustomerRoute />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<CustomerOrders />} />
            <Route path="/orders/:id" element={<CustomerOrderDetail />} />
            <Route path="/invoices" element={<Navigate to="/orders" replace />} />
          </Route>
        </Route>

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Authentication />} />
          <Route path="/register" element={<Authentication />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-otp" element={<OtpVerification />} />
          <Route path="/superadmin/login" element={<AdminAuthentication />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/superadmin" element={<Dashboard />} />
            <Route path="/superadmin/orders" element={<Orders />} />
            <Route path="/superadmin/returns" element={<Returns />} />
            <Route path="/superadmin/catalog" element={<Catalog />} />
            <Route path="/superadmin/promotions" element={<Promotions />} />
            <Route path="/superadmin/books" element={<Books />} />
            <Route path="/superadmin/users" element={<Users />} />
            <Route path="/superadmin/settings" element={<Settings />} />
          </Route>
        </Route>

      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
