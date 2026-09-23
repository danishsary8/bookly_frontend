import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpen, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerLoginForm from "../../components/Authentication/CustomerLoginForm";
import CustomerRegisterForm from "../../components/Authentication/CustomerRegisterForm";

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";

  return (
    <div className="relative overflow-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="section-wrap">
        <div className="relative overflow-hidden rounded-[32px] border border-border/50 bg-card/85 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.10),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_24%)]" />

          <div className="relative grid min-h-[72vh] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="hidden border-r border-border/40 p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
              <div>
                <Link to="/" className="inline-flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.24)]">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tracking-tight text-foreground">Bookly</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">Cambodia Book Store</p>
                  </div>
                </Link>

                <div className="mt-14 max-w-xl">
                  <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Customer Experience
                  </p>
                  <h1 className="mt-6 text-4xl font-bold leading-tight text-foreground xl:text-5xl">
                    {isLogin ? "Welcome back to your reading desk." : "Create your account and start building your shelf."}
                  </h1>
                  <p className="mt-5 max-w-lg text-base leading-8 text-foreground/68">
                    Discover books, place orders, print invoices, track deliveries, and manage your account from one clean customer hub.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl border border-border/50 bg-background/65 p-5">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-sm font-bold text-foreground">Fast checkout</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/60">Profile-aware checkout with cleaner order flow.</p>
                </div>
                <div className="rounded-3xl border border-border/50 bg-background/65 p-5">
                  <ReceiptText className="h-5 w-5 text-accent" />
                  <p className="mt-4 text-sm font-bold text-foreground">Invoice history</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/60">Track purchases, receipts, and return requests in one place.</p>
                </div>
                <div className="rounded-3xl border border-border/50 bg-background/65 p-5">
                  <ArrowRight className="h-5 w-5 text-foreground/65" />
                  <p className="mt-4 text-sm font-bold text-foreground">Smooth account flow</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/60">A cleaner sign-in and register experience across devices.</p>
                </div>
              </div>
            </section>

            <section className="relative flex items-center justify-center p-4 sm:p-8 lg:p-10 xl:p-12">
              <div className="w-full max-w-xl">
                <div className="rounded-[28px] border border-border/50 bg-card/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:p-8">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        {isLogin ? "Customer Login" : "Customer Register"}
                      </p>
                      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                        {isLogin ? "Sign in to your account" : "Create your account"}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-foreground/65">
                        {isLogin
                          ? "Continue to your cart, profile hub, and invoice history."
                          : "Set up your customer profile for faster checkout and cleaner order history."}
                      </p>
                    </div>

                    <Link to="/" className="hidden rounded-2xl border border-border/50 bg-background/70 px-4 py-2 text-sm font-semibold text-foreground/70 transition-all duration-150 hover:bg-background hover:text-foreground sm:inline-flex">
                      Storefront
                    </Link>
                  </div>

                  <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-background/60 p-1.5">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                        isLogin ? "bg-card text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                        !isLogin ? "bg-card text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isLogin ? "login" : "register"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isLogin ? <CustomerLoginForm /> : <CustomerRegisterForm />}
                    </motion.div>
                  </AnimatePresence>

                  {isLogin ? (
                    <button
                      type="button"
                      onClick={() => navigate("/?guest=1")}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-border/50 bg-background/70 px-5 py-3 text-sm font-semibold text-foreground/72 transition-all duration-150 hover:bg-background hover:text-foreground"
                    >
                      Continue as Guest
                    </button>
                  ) : null}

                  <p className="mt-7 text-center text-sm text-foreground/58">
                    {isLogin ? "Need an account? " : "Already have an account? "}
                    <Link to={isLogin ? "/register" : "/login"} className="font-semibold text-primary transition-colors duration-150 hover:text-primary/80">
                      {isLogin ? "Create one now" : "Sign in here"}
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
