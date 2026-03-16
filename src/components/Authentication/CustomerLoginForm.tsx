import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import authService from "../../services/auth.service";

interface CustomerLoginFormProps {
    onLoginSuccess?: () => void;
}

const Login = ({ onLoginSuccess }: CustomerLoginFormProps) => {
    const [mode, setMode] = useState<"login" | "forgot">("login");
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [forgotEmail, setForgotEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await authService.adminLogin({ email, password });
            if (response.admin && response.admin.role === "admin") {
                onLoginSuccess?.();
                navigate("/admin");
            } else {
                onLoginSuccess?.();
                navigate("/");
            }
        } catch (err: any) {
            try {
                await authService.login({ email, password });
                onLoginSuccess?.();
                navigate("/");
            } catch (clientErr: any) {
                setError(err.response?.data?.message || clientErr.response?.data?.message || "Login failed. Please check your credentials.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const enteredEmail = forgotEmail.trim();
            const response = await authService.forgotPassword(enteredEmail);
            setSuccessMessage(response.message || "OTP sent to email.");
            navigate(`/verify-otp?mode=reset&email=${encodeURIComponent(enteredEmail)}`);
        } catch (err: any) {
            const status = err?.response?.status;
            const backendMessage: string = err?.response?.data?.message || "";
            if (status === 404) {
                setError("Email is not registered yet. Please sign up first.");
            } else if (backendMessage.toLowerCase().includes("smtp is not configured")) {
                setError("Email service is not configured. Please set MAIL_* in backend .env.");
            } else {
                setError(backendMessage || "Failed to process forgot password request.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={mode === "login" ? handleSubmit : handleForgotPassword} className="space-y-4">
            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center font-body">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center font-body">
                    {successMessage}
                </div>
            )}

            {mode === "login" ? (
                <>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/40"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/40"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="text-xs font-semibold text-orange-600 hover:underline"
                            onClick={() => {
                                setMode("forgot");
                                setForgotEmail(email);
                                setError(null);
                                setSuccessMessage(null);
                            }}
                        >
                            Forgot password?
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="text-sm text-slate-600 pb-1">
                        Enter your email to receive OTP code.
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/40"
                        />
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                        onClick={() => {
                            setMode("login");
                            setError(null);
                            setSuccessMessage(null);
                        }}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to login
                    </button>
                </>
            )}

            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {mode === "login" ? "Logging in..." : "Sending OTP..."}
                    </>
                ) : (
                    mode === "login" ? "Login" : "Send OTP"
                )}
            </motion.button>
        </form>
    );
};

export default Login;
