import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Loading from "../components/ui/loading";
import PublicRoute from "../components/PublicRoute";
import AdminLayout from "../layouts/AdminLayout";
import ClientLayout from "../layouts/ClientLayout";
import ProtectedRoute from "./ProtectedRoute";
import LegacyBrowseRedirect from "./LegacyBrowseRedirect";
import LegacyOrderRedirect from "./LegacyOrderRedirect";
import { GuestOnly, RequireCustomer, RequireVerified } from "./guards";

const Home = lazy(() => import("../pages/HomePage"));
const CartPage = lazy(() => import("../pages/cart/CartPage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const VerifyEmailPage = lazy(() => import("../pages/auth/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const loadBookDetail = () => import("../pages/catalog/BookDetailPage");
const BookDetail = lazy(loadBookDetail);
const CheckoutPage = lazy(() => import("../pages/checkout/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("../pages/checkout/OrderConfirmationPage"));
const AccountLayout = lazy(() => import("../features/account/AccountLayout").then((m) => ({ default: m.AccountLayout })));
const AccountOverviewPage = lazy(() => import("../pages/account/AccountOverviewPage"));
const ProfilePage = lazy(() => import("../pages/account/ProfilePage"));
const SecurityPage = lazy(() => import("../pages/account/SecurityPage"));
const AddressesPage = lazy(() => import("../pages/account/AddressesPage"));
const WishlistPage = lazy(() => import("../pages/account/WishlistPage"));
const OrdersPage = lazy(() => import("../pages/account/OrdersPage"));
const OrderDetailPage = lazy(() => import("../pages/account/OrderDetailPage"));
const ReturnRequestPage = lazy(() => import("../pages/account/ReturnRequestPage"));
const ReturnsPage = lazy(() => import("../pages/account/ReturnsPage"));
const ReturnDetailPage = lazy(() => import("../pages/account/ReturnDetailPage"));
const ReviewsPage = lazy(() => import("../pages/account/ReviewsPage"));
const Dashboard = lazy(() => import("../page/admin/Dashboard"));
const Catalog = lazy(() => import("../page/admin/Catalog"));
const Promotions = lazy(() => import("../page/admin/Promotions"));
const Orders = lazy(() => import("../page/admin/Orders"));
const Returns = lazy(() => import("../page/admin/Returns"));
const Books = lazy(() => import("../page/admin/Books"));
const Users = lazy(() => import("../page/admin/Users"));
const Settings = lazy(() => import("../page/admin/Settings"));
const AdminAuthentication = lazy(() => import("../page/admin/AdminAuthentication"));
const ShippingPage = lazy(() => import("../pages/content/ShippingPage"));
const ReturnsPolicyPage = lazy(() => import("../pages/content/ReturnsPolicyPage"));
const FaqPage = lazy(() => import("../pages/content/FaqPage"));
const AboutPage = lazy(() => import("../pages/content/AboutPage"));
const ContactPage = lazy(() => import("../pages/content/ContactPage"));
const PrivacyPage = lazy(() => import("../pages/content/PrivacyPage"));
const TermsPage = lazy(() => import("../pages/content/TermsPage"));
const NotFound = lazy(() => import("../pages/content/NotFoundPage"));
const BooksPage = lazy(() => import("../pages/catalog/BooksPage"));
const SearchPage = lazy(() => import("../pages/catalog/SearchPage"));
const AuthorsPage = lazy(() => import("../pages/catalog/AuthorsPage"));
const AuthorPage = lazy(() => import("../pages/catalog/AuthorPage"));
const SeriesListPage = lazy(() => import("../pages/catalog/SeriesListPage"));
const SeriesPage = lazy(() => import("../pages/catalog/SeriesPage"));
const CategoryPage = lazy(() => import("../pages/catalog/CategoryPage"));
const PublisherPage = lazy(() => import("../pages/catalog/PublisherPage"));
// Development-only reference page for the UI kit; not part of production builds.
const UiKit = import.meta.env.DEV ? lazy(() => import("../pages/dev/UiKit")) : null;

const AppRoutes = () => {
  // Prefetch the book page while idle so the cover morph never waits on a lazy chunk.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => void loadBookDetail());
  }, []);

  return (
    <Suspense fallback={<div className="section-wrap py-10"><Loading /></div>}>
      <Routes>
        {/* Redirects sit outside the layout so the page transition never re-runs them. */}
        <Route path="/browse" element={<LegacyBrowseRedirect />} />
        <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
        <Route path="/favorites" element={<Navigate to="/account/wishlist" replace />} />
        <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
        <Route path="/orders/:id" element={<LegacyOrderRedirect />} />
        <Route path="/invoices" element={<Navigate to="/account/orders" replace />} />
        <Route element={<ClientLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/authors" element={<AuthorsPage />} />
          <Route path="/authors/:id" element={<AuthorPage />} />
          <Route path="/series" element={<SeriesListPage />} />
          <Route path="/series/:id" element={<SeriesPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/publishers/:id" element={<PublisherPage />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/returns-policy" element={<ReturnsPolicyPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {UiKit ? <Route path="/ui-kit" element={<UiKit />} /> : null}
          <Route path="*" element={<NotFound />} />
          <Route element={<RequireVerified />}>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/success/:id" element={<OrderConfirmationPage />} />
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<AccountOverviewPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="orders/:id/return" element={<ReturnRequestPage />} />
              <Route path="returns" element={<ReturnsPage />} />
              <Route path="returns/:id" element={<ReturnDetailPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<RequireCustomer />}>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>
        {/* V1 sent password-reset codes to /verify-otp. */}
        <Route path="/verify-otp" element={<Navigate to="/reset-password" replace />} />

        <Route element={<PublicRoute />}>
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
