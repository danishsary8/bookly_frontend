import { motion } from "framer-motion";
import { BookOpen, ShieldCheck } from "lucide-react";
import AdminLoginForm from "../../components/Authentication/AdminLoginForm";

const AdminAuthentication = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 px-4 font-inter relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-300/10 rounded-full blur-3xl pointer-events-none" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-slate-900/75 border border-white/10 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-8 md:p-10 relative overflow-hidden backdrop-blur-xl"
            >
                {/* Background Accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#fc8200]/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#fc8200]/10 rounded-full blur-3xl pointer-events-none" />

                {/* Logo */}
                <div className="flex flex-col items-center justify-center gap-3 mb-8 relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-[#fc8200]/20">
                        <BookOpen className="h-6 w-6 text-black" />
                    </div>
                    <div className="text-center">
                        <span className="block font-display text-2xl font-bold text-white tracking-tight">
                            Bookly <span className="text-[#fc8200]">Admin</span>
                        </span>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#fc8200]" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Secure Access</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <h1 className="font-display text-3xl font-bold text-white mb-2">
                        Welcome Back
                    </h1>
                    <p className="font-body text-sm text-white/60 mb-8 leading-relaxed">
                        Sign in to access your administrative dashboard and manage your library system.
                    </p>

                    <div className="admin-login-wrapper">
                        <AdminLoginForm />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 pt-6 border-t border-white/5 text-center relative z-10">
                    <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
                        &copy; 2026 Bookly Management System
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminAuthentication;
