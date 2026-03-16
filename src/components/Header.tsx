import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Menu, ShoppingCart, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import authService from "../services/auth.service";
import { Button } from "./ui/button";
import { CART_CHANGED_EVENT, cartItemCount, loadCart } from "../lib/cart";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/browse" },
  { label: "Cart", to: "/cart" },
  { label: "Favorites", to: "/favorites" },
  { label: "Help", to: "/#help" }
];

const Header = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(Cookies.get("token")));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(Boolean(Cookies.get("token")));
      setCartCount(cartItemCount(loadCart()));
    };
    const syncCartState = () => setCartCount(cartItemCount(loadCart()));

    syncAuthState();
    window.addEventListener("auth-changed", syncAuthState);
    window.addEventListener(CART_CHANGED_EVENT, syncCartState);

    return () => {
      window.removeEventListener("auth-changed", syncAuthState);
      window.removeEventListener(CART_CHANGED_EVENT, syncCartState);
    };
  }, []);

  const handleSignOut = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50">
      <nav className="section-wrap pt-5 pb-4">
        <motion.div
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="glass-surface rounded-3xl px-4 md:px-6 py-3 flex items-center justify-between border-white/70"
        >
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/")} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-300/40">
                <BookOpen className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Bookly</h1>
            </button>

            <div className="hidden md:flex items-center gap-2 rounded-2xl bg-white/65 border border-white/70 p-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isActive ? "bg-white text-slate-900 border border-slate-200/60 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:bg-slate-900 transition-colors shadow-[0_8px_20px_rgba(15,23,42,0.2)]"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5 text-white" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white/90">
                {cartCount}
              </span>
            </button>

            {isLoggedIn ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl px-5 font-semibold bg-white/70 border-white/70 hover:bg-white hidden sm:inline-flex"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold hover:bg-white/60 rounded-xl hidden sm:inline-flex"
                  onClick={() => navigate("/register")}
                >
                  Register
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl px-5 font-semibold bg-white/70 border-white/70 hover:bg-white hidden sm:inline-flex"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
              </>
            )}

            <button
              className="md:hidden p-2.5 rounded-xl bg-white/75 border border-white/70 text-slate-700"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-3 glass-surface rounded-2xl p-3 border border-white/70"
            >
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(item.to);
                    }}
                    className="rounded-xl py-2.5 text-sm font-semibold bg-white/70 hover:bg-white text-slate-700 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}

                {isLoggedIn ? (
                  <button
                    onClick={handleSignOut}
                    className="col-span-2 rounded-xl py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/register");
                      }}
                      className="rounded-xl py-2.5 text-sm font-semibold bg-white/75 hover:bg-white text-slate-700 transition-colors"
                    >
                      Register
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/login");
                      }}
                      className="rounded-xl py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Header;
