import { motion, AnimatePresence } from "framer-motion";
import { BookOpen } from "lucide-react";
import CustomerLoginForm from "../../components/Authentication/CustomerLoginForm";
import CustomerRegisterForm from "../../components/Authentication/CustomerRegisterForm";
import { useLocation, Link, useNavigate } from "react-router-dom";

const Auth = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLogin = location.pathname === "/login";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-orange-100 px-4 py-4 sm:py-8 relative overflow-hidden">
            <div className="absolute -top-16 -left-16 w-72 h-72 bg-orange-300/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-amber-300/25 rounded-full blur-3xl" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md bg-white/90 border border-white/80 rounded-3xl shadow-[0_24px_60px_rgba(15,23,42,0.2)] p-6 md:p-8 backdrop-blur-xl"
            >
                {/* Logo */}
                <a href="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="font-display text-xl font-bold text-foreground tracking-tight">
                        Bookly
                    </span>
                </a>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={isLogin ? "login" : "register"}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        <h1 className="font-display text-3xl font-bold text-foreground mb-1">
                            {isLogin ? "Login" : "Sign Up"}
                        </h1>
                        <p className="font-body text-sm text-muted-foreground mb-6 leading-relaxed">
                            {isLogin
                                ? "Welcome back! Sign in to continue."
                                : "Create your account to get started."}
                        </p>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                        >

                            {isLogin ? <CustomerLoginForm /> : <CustomerRegisterForm />}

                        </motion.div>

                        {isLogin && (
                            <button
                                type="button"
                                onClick={() => navigate("/?guest=1")}
                                className="mt-3 w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Continue as Guest
                            </button>
                        )}

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-6">
                            <div className="flex-1 h-px bg-border" />
                            <span className="font-body text-xs text-muted-foreground">or continue with</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Social buttons */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                {
                                    label: "Google", icon: (
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    )
                                },
                                {
                                    label: "Facebook", icon: (
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#1877F2">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>
                                    )
                                },
                                {
                                    label: "Twitter", icon: (
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    )
                                },
                                {
                                    label: "Apple", icon: (
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                        </svg>
                                    )
                                },
                            ].map((provider) => (
                                <motion.button
                                    key={provider.label}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex cursor-pointer items-center justify-center h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                                    title={`Sign in with ${provider.label}`}
                                >
                                    {provider.icon}
                                </motion.button>
                            ))}
                        </div>

                        {/* Toggle */}
                        <p className="text-center mt-6 font-body text-sm text-muted-foreground">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <Link to={isLogin ? "/register" : "/login"} className="font-semibold cursor-pointer text-orange-600 hover:underline">
                                {isLogin ? "Sign up" : "Login"}
                            </Link>
                        </p>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default Auth;
