import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import authService from "../../services/auth.service";

const AdminLoginForm = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await authService.adminLogin({ email, password });
            if (response.data.user.role === "admin") {
                navigate("/superadmin");
            } else {
                setError("Access denied. You do not have admin privileges.");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Admin login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 font-inter">
            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-body">
                    {error}
                </div>
            )}

            {/* Email */}
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Admin Email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/20 bg-white/10 font-body text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#fc8200]/30 focus:border-[#fc8200]/50 transition-all"
                />
            </div>

            {/* Password */}
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin Password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-white/20 bg-white/10 font-body text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#fc8200]/30 focus:border-[#fc8200]/50 transition-all"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>

            {/* Submit */}
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 cursor-pointer text-black font-display text-sm font-bold tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-[#fc8200]/20"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Authenticating...
                    </>
                ) : (
                    "Authorize Access"
                )}
            </motion.button>
        </form>
    );
};

export default AdminLoginForm;
