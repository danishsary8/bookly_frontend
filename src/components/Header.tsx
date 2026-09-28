import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeHelp,
  BookOpen,
  Heart,
  Home,
  Menu,
  MoonStar,
  Search,
  ShoppingCart,
  Store,
  SunMedium,
  UserCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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

// Favorites moved out of the text nav into the right-hand icon cluster (Search · Wishlist · Cart · Account).
const navItems: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Shop", to: "/browse", icon: Store },
  { label: "Help", to: "/#help", icon: BadgeHelp },
];

// MASTER §6.1: every control in the bar is 44×44 and uses the ghost variant.
const iconButton =
  "grid h-11 w-11 shrink-0 place-items-center rounded-lg text-foreground transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-offset-background";

// MASTER §6.2, with the header deviation recorded in design-system/bookly/pages/header.md:
// h-11 instead of h-12 so the field shares one height with the icon cluster.
const searchField =
  "h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card dark:focus:ring-offset-background";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { settings } = useStorefrontSettings();
  const { isDark, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const user = getStoredUser();
    return user?.role === "customer" ? user : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAccessToken()) && getStoredUser()?.role === "customer");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // The field is editable, but a URL change (header submit, back/forward, a cleared
  // filter chip on Browse) re-seeds it. Synced during render rather than in an effect
  // so there is no cascading second render.
  const urlQuery = searchParams.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);

  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setSearchQuery(urlQuery);
  }

  // Collapse the mobile panel and the search row whenever the route changes.
  const locationKey = `${location.pathname}${location.hash}`;
  const [lastLocationKey, setLastLocationKey] = useState(locationKey);

  if (locationKey !== lastLocationKey) {
    setLastLocationKey(locationKey);
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }

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

  // MASTER §6.10: the count is spoken, never left to the badge glyph alone.
  const cartLabel = useMemo(() => {
    if (cartCount <= 0) {
      return "Cart, empty";
    }

    return `Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`;
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

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();

    navigate(query ? `/browse?search=${encodeURIComponent(query)}` : "/browse");
    setIsSearchOpen(false);
    setIsMenuOpen(false);
  };

  const renderSearchForm = (id: string, autoFocus = false) => (
    <form role="search" onSubmit={handleSearchSubmit}>
      <label htmlFor={id} className="sr-only">
        Search books by title or author
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          name="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search books"
          autoComplete="off"
          autoFocus={autoFocus}
          className={searchField}
        />
      </div>
    </form>
  );

  const renderThemeToggle = (variant: "bar" | "panel") => (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: variant === "bar" ? 0.96 : 0.985 }}
      className={`theme-icon-toggle ${variant === "panel" ? "theme-icon-toggle--mobile " : ""}${
        isDark ? "theme-icon-toggle--dark" : ""
      }`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={variant === "bar" ? `Switch to ${isDark ? "light" : "dark"} mode` : undefined}
    >
      <span className="theme-icon-toggle__glow" />
      <span className="theme-icon-toggle__rail" />
      <motion.span
        initial={false}
        animate={{ scale: isDark ? 0.94 : 1.05, opacity: isDark ? 0.24 : 0.4 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="theme-icon-toggle__halo"
      />
      {variant === "panel" ? (
        <span className="theme-icon-toggle__label">{isDark ? "Dark mode active" : "Light mode active"}</span>
      ) : null}
      <motion.span
        initial={false}
        animate={{ rotate: isDark ? 0 : 90, scale: isDark ? 1 : 1.04 }}
        transition={{ type: "spring", stiffness: 360, damping: 26, mass: 0.65 }}
        className="theme-icon-toggle__core"
      >
        <span className="theme-icon-toggle__icon-stack">
          <motion.span
            initial={false}
            animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0.55 : 1, rotate: isDark ? -90 : 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="theme-icon-toggle__icon theme-icon-toggle__icon--sun"
          >
            <SunMedium className={variant === "bar" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />
          </motion.span>
          <motion.span
            initial={false}
            animate={{ opacity: isDark ? 1 : 0, scale: isDark ? 1 : 0.55, rotate: isDark ? 0 : 90 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="theme-icon-toggle__icon theme-icon-toggle__icon--moon"
          >
            <MoonStar className={variant === "bar" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />
          </motion.span>
        </span>
      </motion.span>
    </motion.button>
  );

  return (
    <>
      {/* MASTER §7: first focusable element on the page. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* MASTER §6.10: 72px (64px mobile), sticky, card surface, bottom hairline.
          §1 and §8 keep it hairline-only at rest — no shadow appears on scroll. */}
      <header className="sticky top-0 z-50 border-b border-border bg-card dark:bg-background">
        <div className="section-wrap">
          <div className="flex h-16 items-center gap-3 lg:h-[72px] lg:gap-6">
            <button
              onClick={() => handleNavigation("/")}
              className="group flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg text-left transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-offset-background"
              aria-label={`Go to ${settings.store_name} homepage`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-xl leading-tight text-primary">
                  {settings.store_name}
                </span>
                <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:block">
                  Cambodia Store
                </span>
              </span>
            </button>

            <nav aria-label="Main" className="hidden lg:flex lg:items-center lg:gap-1">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item);

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleNavigation(item.to)}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex h-11 items-center rounded-lg px-3 text-[15px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-offset-background ${
                      isActive ? "text-foreground hover:text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="relative">
                      {item.label}
                      {isActive ? (
                        <span
                          className="absolute inset-x-0 -bottom-1.5 h-0.5 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              {/* Persistent field from lg up, where there is room; an icon that expands below that. */}
              <div className="hidden w-56 lg:block xl:w-64">{renderSearchForm("header-search")}</div>

              <button
                type="button"
                onClick={() => setIsSearchOpen((prev) => !prev)}
                className={`${iconButton} lg:hidden`}
                aria-label="Search books"
                aria-expanded={isSearchOpen}
                aria-controls="header-search-panel"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigation("/favorites")}
                className={iconButton}
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigation("/cart")}
                className={`${iconButton} relative`}
                aria-label={cartLabel}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {cartCount > 0 ? (
                  <span
                    className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-accent-foreground"
                    aria-hidden="true"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </button>

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => handleNavigation("/profile")}
                  className={`${iconButton} hidden lg:grid`}
                  aria-label={`Account, signed in as ${customerName}`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {customerInitials}
                  </span>
                </button>
              ) : null}

              <span className="mx-0.5 hidden h-6 w-px bg-border lg:block" aria-hidden="true" />

              {renderThemeToggle("bar")}

              {isLoggedIn ? null : (
                <div className="hidden items-center gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/register")}
                    className="inline-flex h-11 items-center rounded-lg border border-input px-4 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-offset-background"
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigation("/login")}
                    className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-offset-background"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`${iconButton} lg:hidden`}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMenuOpen}
                aria-controls="header-mobile-panel"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isSearchOpen ? (
              <motion.div
                id="header-search-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden lg:hidden motion-reduce:transition-none"
              >
                <div className="pb-3">{renderSearchForm("header-search-mobile", true)}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isMenuOpen ? (
            <motion.div
              id="header-mobile-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden border-t border-border bg-card dark:bg-background lg:hidden motion-reduce:transition-none"
            >
              <div className="section-wrap grid gap-3 py-4">
                {isLoggedIn ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {customerInitials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{customerName}</span>
                      <span className="block truncate text-sm text-muted-foreground">{currentUser?.email}</span>
                    </span>
                  </div>
                ) : null}

                {renderSearchForm("header-search-panel-field")}

                <nav aria-label="Mobile" className="grid gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavItemActive(item);

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleNavigation(item.to)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex h-12 items-center gap-3 rounded-lg px-3 text-left font-display text-xl transition-colors duration-150 ${
                          isActive ? "border-l-2 border-primary text-primary hover:bg-surface-2" : "text-foreground hover:bg-surface-2"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>

                <div className="h-px bg-border" aria-hidden="true" />

                <div className="grid gap-1">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/favorites")}
                    className="flex h-12 items-center gap-3 rounded-lg px-3 text-left text-[15px] font-medium text-foreground transition-colors duration-150 hover:bg-surface-2"
                  >
                    <Heart className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    Wishlist
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation("/cart")}
                    className="flex h-12 items-center gap-3 rounded-lg px-3 text-left text-[15px] font-medium text-foreground transition-colors duration-150 hover:bg-surface-2"
                    aria-label={cartLabel}
                  >
                    <ShoppingCart className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    Cart
                    {cartCount > 0 ? (
                      <span
                        className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-accent-foreground"
                        aria-hidden="true"
                      >
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation(isLoggedIn ? "/profile" : "/register")}
                    className="flex h-12 items-center gap-3 rounded-lg px-3 text-left text-[15px] font-medium text-foreground transition-colors duration-150 hover:bg-surface-2"
                  >
                    <UserCircle2 className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    {isLoggedIn ? "Account" : "Register"}
                  </button>
                </div>

                <div className="grid gap-2">
                  {renderThemeToggle("panel")}

                  {isLoggedIn ? null : (
                    <button
                      type="button"
                      onClick={() => handleNavigation("/login")}
                      className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Header;
