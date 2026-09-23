import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeHelp,
  BookOpen,
  Heart,
  Home,
  Menu,
  MoonStar,
  ShoppingCart,
  Store,
  SunMedium,
  UserCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import customerService from "../services/customer.service";
import { AUTH_CHANGED_EVENT, getAccessToken, getStoredUser } from "../lib/session";
import { CART_CHANGED_EVENT } from "../lib/cart";
import type { User } from "../types/auth.types";
import { useStorefrontSettings } from "../contexts/StorefrontSettingsContext";
import { useTheme } from "../contexts/ThemeContext";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Shop", to: "/browse", icon: Store },
  { label: "Favorites", to: "/favorites", icon: Heart },
  { label: "Help", to: "/#help", icon: BadgeHelp },
];

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useStorefrontSettings();
  const { isDark, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const user = getStoredUser();
    return user?.role === "customer" ? user : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAccessToken()) && getStoredUser()?.role === "customer");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    let isMounted = true;

    const syncAuthState = () => {
      const token = getAccessToken();
      const user = getStoredUser();
      const customerUser = user?.role === "customer" ? user : null;
      const loggedIn = Boolean(token) && Boolean(customerUser);

      if (!isMounted) {
        return;
      }

      setCurrentUser(customerUser);
      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        setCartCount(0);
      }
    };

    const syncCartState = async () => {
      const token = getAccessToken();
      const user = getStoredUser();

      if (!token || user?.role !== "customer") {
        if (isMounted) {
          setCartCount(0);
        }
        return;
      }

      try {
        const cart = await customerService.getCart();
        if (isMounted) {
          setCartCount(cart.item_count);
        }
      } catch {
        if (isMounted) {
          setCartCount(0);
        }
      }
    };

    const handleAuthChanged = () => {
      syncAuthState();
      void syncCartState();
    };

    const handleCartChanged = () => {
      void syncCartState();
    };

    syncAuthState();
    void syncCartState();

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener(CART_CHANGED_EVENT, handleCartChanged);

    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener(CART_CHANGED_EVENT, handleCartChanged);
    };
  }, []);

  const customerName = useMemo(() => {
    if (!currentUser) {
      return "Guest";
    }

    const fullName = `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim();
    return fullName || currentUser.name || currentUser.email.split("@")[0];
  }, [currentUser]);

  const customerInitials = useMemo(() => {
    const segments = customerName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase());

    return segments.join("") || "BK";
  }, [customerName]);

  const cartLabel = useMemo(() => {
    if (cartCount <= 0) {
      return "Cart is empty";
    }

    return `${cartCount} item${cartCount === 1 ? "" : "s"}`;
  }, [cartCount]);

  const isNavItemActive = (item: NavItem) => {
    if (item.to === "/") {
      return location.pathname === "/" && location.hash === "";
    }

    if (item.to.startsWith("/#")) {
      return location.pathname === "/" && location.hash === item.to.slice(1);
    }

    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  const handleNavigation = (to: string) => {
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <nav className="section-wrap">
        <motion.div
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="rounded-[28px] border border-white/80 bg-background/85 px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:px-4 lg:px-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 lg:gap-4">
              <button
                onClick={() => handleNavigation("/")}
                className="group flex min-w-0 items-center gap-3 text-left"
                aria-label={`Go to ${settings.store_name} homepage`}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-700 text-primary-foreground shadow-[0_12px_24px_rgba(16,185,129,0.22)] transition-transform duration-200 group-hover:-translate-y-0.5">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold tracking-tight text-foreground">{settings.store_name}</p>
                  <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/40 md:block">
                    Cambodia Store
                  </p>
                </div>
              </button>

              <div className="hidden lg:flex items-center gap-1 rounded-full border border-border/50 bg-card/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavItemActive(item);

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleNavigation(item.to)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
                          : "text-foreground/65 hover:bg-background hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => handleNavigation("/cart")}
                className="group relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-card/80 text-foreground shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-background"
                aria-label="Open cart"
              >
                <ShoppingCart className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground ring-2 ring-background">
                    {cartCount}
                  </span>
                ) : null}
              </button>

              {isLoggedIn ? (
                <div className="hidden items-center gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/profile")}
                    className="inline-flex h-11 items-center gap-3 rounded-2xl border border-border/50 bg-card/80 px-3.5 text-left text-foreground shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-background"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-bold text-white">
                      {customerInitials}
                    </div>
                    <div className="hidden xl:block">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">Customer Hub</p>
                      <p className="max-w-28 truncate text-sm font-semibold">{customerName}</p>
                    </div>
                    <UserCircle2 className="h-4 w-4 text-foreground/45" />
                  </button>
                </div>
              ) : (
                <div className="hidden items-center gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/register")}
                    className="inline-flex h-11 items-center rounded-2xl border border-border/50 bg-card/70 px-4 text-sm font-semibold text-foreground/75 transition-all duration-200 hover:bg-background hover:text-foreground"
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigation("/login")}
                    className="inline-flex h-11 items-center rounded-2xl bg-gradient-to-r from-primary to-emerald-700 px-5 text-sm font-semibold text-primary-foreground shadow-[0_12px_24px_rgba(16,185,129,0.2)] transition-all duration-200 hover:-translate-y-0.5"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <motion.button
                type="button"
                onClick={toggleTheme}
                whileTap={{ scale: 0.96 }}
                className={`theme-icon-toggle ${isDark ? "theme-icon-toggle--dark" : ""}`}
                aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
                title={`Switch to ${isDark ? "light" : "dark"} mode`}
              >
                <span className="theme-icon-toggle__glow" />
                <span className="theme-icon-toggle__rail" />
                <motion.span
                  animate={{ scale: isDark ? 0.94 : 1.05, opacity: isDark ? 0.24 : 0.4 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="theme-icon-toggle__halo"
                />
                <motion.span
                  animate={{
                    rotate: isDark ? 0 : 90,
                    scale: isDark ? 1 : 1.04,
                  }}
                  transition={{ type: "spring", stiffness: 360, damping: 26, mass: 0.65 }}
                  className="theme-icon-toggle__core"
                >
                  <span className="theme-icon-toggle__icon-stack">
                    <motion.span
                      animate={{
                        opacity: isDark ? 0 : 1,
                        scale: isDark ? 0.55 : 1,
                        rotate: isDark ? -90 : 0,
                      }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="theme-icon-toggle__icon theme-icon-toggle__icon--sun"
                    >
                      <SunMedium className="h-[18px] w-[18px]" />
                    </motion.span>
                    <motion.span
                      animate={{
                        opacity: isDark ? 1 : 0,
                        scale: isDark ? 1 : 0.55,
                        rotate: isDark ? 0 : 90,
                      }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="theme-icon-toggle__icon theme-icon-toggle__icon--moon"
                    >
                      <MoonStar className="h-[18px] w-[18px]" />
                    </motion.span>
                  </span>
                </motion.span>
              </motion.button>

              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-border/50 bg-card/70 text-foreground transition-colors duration-200 hover:bg-background lg:hidden"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMenuOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="mt-4 overflow-hidden rounded-[24px] border border-border/50 bg-card/95 p-4 shadow-[0_18px_36px_rgba(15,23,42,0.08)] lg:hidden"
              >
                <div className="grid gap-3">
                  {isLoggedIn ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/70 p-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-bold text-white">
                        {customerInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{customerName}</p>
                        <p className="truncate text-xs text-foreground/55">{currentUser?.email}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <motion.button
                      type="button"
                      onClick={toggleTheme}
                      whileTap={{ scale: 0.985 }}
                      className={`theme-icon-toggle theme-icon-toggle--mobile ${isDark ? "theme-icon-toggle--dark" : ""}`}
                      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
                    >
                      <span className="theme-icon-toggle__glow" />
                      <span className="theme-icon-toggle__rail" />
                      <motion.span
                        animate={{ scale: isDark ? 0.94 : 1.05, opacity: isDark ? 0.24 : 0.4 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="theme-icon-toggle__halo"
                      />
                      <span className="theme-icon-toggle__label">
                        {isDark ? "Dark mode active" : "Light mode active"}
                      </span>
                      <motion.span
                        animate={{
                          rotate: isDark ? 0 : 90,
                          scale: isDark ? 1 : 1.04,
                        }}
                        transition={{ type: "spring", stiffness: 360, damping: 26, mass: 0.65 }}
                        className="theme-icon-toggle__core"
                      >
                        <span className="theme-icon-toggle__icon-stack">
                          <motion.span
                            animate={{
                              opacity: isDark ? 0 : 1,
                              scale: isDark ? 0.55 : 1,
                              rotate: isDark ? -90 : 0,
                            }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="theme-icon-toggle__icon theme-icon-toggle__icon--sun"
                          >
                            <SunMedium className="h-3.5 w-3.5" />
                          </motion.span>
                          <motion.span
                            animate={{
                              opacity: isDark ? 1 : 0,
                              scale: isDark ? 1 : 0.55,
                              rotate: isDark ? 0 : 90,
                            }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="theme-icon-toggle__icon theme-icon-toggle__icon--moon"
                          >
                            <MoonStar className="h-3.5 w-3.5" />
                          </motion.span>
                        </span>
                      </motion.span>
                    </motion.button>

                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isNavItemActive(item);

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleNavigation(item.to)}
                          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
                              : "border border-border/40 bg-background/70 text-foreground hover:bg-background"
                          }`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </span>
                          <span className="text-xs uppercase tracking-[0.16em] opacity-60">
                            {item.label === "Home" ? "Start" : item.label === "Shop" ? "Books" : item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleNavigation("/cart")}
                      className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground"
                    >
                      <span className="inline-flex items-center gap-3">
                        <ShoppingCart className="h-4 w-4" />
                        Cart
                      </span>
                      <span>{cartLabel}</span>
                    </button>

                    {isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => handleNavigation("/profile")}
                        className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground"
                      >
                        <span className="inline-flex items-center gap-3">
                          <UserCircle2 className="h-4 w-4" />
                          Profile Hub
                        </span>
                        <span>Account</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNavigation("/register")}
                        className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground"
                      >
                        <span className="inline-flex items-center gap-3">
                          <UserCircle2 className="h-4 w-4" />
                          Register
                        </span>
                        <span>Join</span>
                      </button>
                    )}
                  </div>

                  {isLoggedIn ? (
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => handleNavigation("/profile")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                      >
                        <UserCircle2 className="h-4 w-4" />
                        Open Profile
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleNavigation("/login")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-700 px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.22)]"
                    >
                      <UserCircle2 className="h-4 w-4" />
                      Sign In
                    </button>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </nav>
    </header>
  );
};

export default Header;
