import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Loading from "../components/ui/loading";
import ClientLayout from "../layouts/ClientLayout";
import LegacyAdminRedirect from "./LegacyAdminRedirect";
import LegacyBrowseRedirect from "./LegacyBrowseRedirect";
import LegacyOrderRedirect from "./LegacyOrderRedirect";
import { GuestOnly, RequireCustomer, RequireVerified } from "./guards";
import { RequireAdminRole, RequireStaff, RequireStaffSetup, StaffGuestOnly } from "./adminGuards";

const Home = lazy(() => import("../pages/HomePage"));
const CartPage = lazy(() => import("../pages/cart/CartPage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const PhoneLoginPage = lazy(() => import("../pages/auth/PhoneLoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const FacebookSignUpPage = lazy(() => import("../pages/auth/FacebookSignUpPage"));
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
const StaffLoginPage = lazy(() => import("../pages/admin/auth/StaffLoginPage"));
const StaffTwoFactorSetupPage = lazy(() => import("../pages/admin/auth/StaffTwoFactorSetupPage"));
const StaffResetPasswordPage = lazy(() => import("../pages/admin/auth/StaffResetPasswordPage"));
const AdminShell = lazy(() => import("../features/admin/AdminShell").then((m) => ({ default: m.AdminShell })));
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const AdminBooksPage = lazy(() => import("../pages/admin/BooksPage"));
const BookEditPage = lazy(() => import("../pages/admin/BookEditPage"));
const LookupPage = lazy(() => import("../pages/admin/LookupPage"));
const OrdersAdminPage = lazy(() => import("../pages/admin/OrdersAdminPage"));
const OrderAdminPage = lazy(() => import("../pages/admin/OrderAdminPage"));
const ReturnsAdminPage = lazy(() => import("../pages/admin/ReturnsAdminPage"));
const ReturnAdminPage = lazy(() => import("../pages/admin/ReturnAdminPage"));
const ReviewsAdminPage = lazy(() => import("../pages/admin/ReviewsAdminPage"));
const CouponsAdminPage = lazy(() => import("../pages/admin/CouponsAdminPage"));
const CustomersAdminPage = lazy(() => import("../pages/admin/CustomersAdminPage"));
const CustomerAdminPage = lazy(() => import("../pages/admin/CustomerAdminPage"));
const MembersAdminPage = lazy(() => import("../pages/admin/MembersAdminPage"));
const ExchangeRatesPage = lazy(() => import("../pages/admin/ExchangeRatesPage"));
const AuditLogPage = lazy(() => import("../pages/admin/AuditLogPage"));
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
          <Route path="/login/phone" element={<PhoneLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sign-up/facebook" element={<FacebookSignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<RequireCustomer />}>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>
        {/* Staff (V2 admin). */}
        <Route element={<StaffGuestOnly />}>
          <Route path="/admin/login" element={<StaffLoginPage />} />
          <Route path="/admin/reset-password" element={<StaffResetPasswordPage />} />
        </Route>
        <Route element={<RequireStaffSetup />}>
          <Route path="/admin/two-factor" element={<StaffTwoFactorSetupPage />} />
        </Route>
        <Route element={<RequireStaff />}>
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="books" element={<AdminBooksPage />} />
            <Route path="books/new" element={<BookEditPage />} />
            <Route path="books/:id" element={<BookEditPage key="edit" />} />
            <Route path="authors" element={<LookupPage key="authors" kind="authors" />} />
            <Route path="categories" element={<LookupPage key="categories" kind="categories" />} />
            <Route path="publishers" element={<LookupPage key="publishers" kind="publishers" />} />
            <Route path="series" element={<LookupPage key="series" kind="series" />} />
            <Route path="orders" element={<OrdersAdminPage />} />
            <Route path="orders/:id" element={<OrderAdminPage />} />
            <Route path="returns" element={<ReturnsAdminPage />} />
            <Route path="returns/:id" element={<ReturnAdminPage />} />
            <Route path="reviews" element={<ReviewsAdminPage />} />
            <Route path="coupons" element={<CouponsAdminPage />} />
            <Route path="customers" element={<CustomersAdminPage />} />
            <Route path="customers/:id" element={<CustomerAdminPage />} />
            <Route element={<RequireAdminRole />}>
              <Route path="members" element={<MembersAdminPage />} />
              <Route path="exchange-rates" element={<ExchangeRatesPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
            </Route>
          </Route>
        </Route>
        {/* V1 sent password-reset codes to /verify-otp. */}
        <Route path="/verify-otp" element={<Navigate to="/reset-password" replace />} />

        {/* V1 admin lived at /superadmin. */}
        <Route path="/superadmin/*" element={<LegacyAdminRedirect />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
