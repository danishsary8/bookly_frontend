import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import authService from "../../services/auth.service";
import { alertToast } from "../../lib/alerts";

interface CustomerLoginFormProps {
  onLoginSuccess?: () => void;
}

const fieldClassName =
  "h-12 w-full rounded-2xl border border-border/60 bg-background/80 px-4 pl-11 text-sm text-foreground placeholder:text-foreground/45 outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

const CustomerLoginForm = ({ onLoginSuccess }: CustomerLoginFormProps) => {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await authService.login({ email, password });
      onLoginSuccess?.();
      navigate("/");
    } catch (error: any) {
      alertToast.error("Login failed", error?.response?.data?.message || "Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const enteredEmail = forgotEmail.trim();
      const response = await authService.forgotPassword(enteredEmail);
      alertToast.success("OTP sent", response.message || "Check your email for the reset code.");
      navigate(`/verify-otp?mode=reset&email=${encodeURIComponent(enteredEmail)}`);
    } catch (error: any) {
      alertToast.error("Unable to send OTP", error?.response?.data?.message || "Failed to process forgot password request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={mode === "login" ? handleSubmit : handleForgotPassword} className="space-y-5">
      {mode === "login" ? (
        <>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={fieldClassName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className={`${fieldClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/42 transition-colors duration-150 hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground/52">Use the same email you used at checkout and profile registration.</p>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold text-primary transition-colors duration-150 hover:text-primary/80"
              onClick={() => {
                setMode("forgot");
                setForgotEmail(email);
              }}
            >
              Forgot password?
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
            <p className="text-sm font-semibold text-foreground">Password reset</p>
            <p className="mt-1 text-sm leading-6 text-foreground/62">
              Enter your email and we will send an OTP code so you can safely reset your password.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="you@example.com"
                className={fieldClassName}
              />
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/62 transition-colors duration-150 hover:text-foreground"
            onClick={() => setMode("login")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        type="submit"
        disabled={isLoading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-primary to-emerald-700 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.20)] transition-all duration-150 hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === "login" ? "Signing in..." : "Sending OTP..."}
          </>
        ) : mode === "login" ? (
          "Sign In"
        ) : (
          "Send OTP Code"
        )}
      </motion.button>
    </form>
  );
};

export default CustomerLoginForm;
