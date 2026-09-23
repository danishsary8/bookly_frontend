import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, X } from "lucide-react";
import authService from "../../services/auth.service";
import { alertModal, alertToast } from "../../lib/alerts";

const OTP_LENGTH = 6;

const OtpVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const otpDigits = Array.from({ length: OTP_LENGTH }, (_, idx) => otp[idx] || "");

  const mapErrorMessage = (err: any, fallback: string) => {
    const backendMessage: string = err?.response?.data?.message || "";
    if (backendMessage.toLowerCase().includes("smtp is not configured")) {
      return "Email service is not configured. Please set MAIL_* in backend .env.";
    }
    return backendMessage || fallback;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alertToast.error("Missing email", "Please retry forgot password.");
      return;
    }

    if (otp.length < OTP_LENGTH) {
      alertToast.warning("Invalid OTP", `Please enter a valid ${OTP_LENGTH}-digit OTP.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      alertToast.warning("Password mismatch", "New password and confirm password do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(otp, newPassword);
      await alertModal.success({
        title: "Password reset successful",
        text: "Your password has been updated. Please login with the new password.",
        confirmButtonText: "Go to Login",
      });
      navigate("/login");
    } catch (err: any) {
      alertToast.error("OTP verification failed", mapErrorMessage(err, "OTP verification failed."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      alertToast.error("Missing email", "Please retry forgot password.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      alertToast.success("OTP resent", "If the account exists, a new OTP has been sent.");
    } catch (err: any) {
      alertToast.error("Failed to resend OTP", mapErrorMessage(err, "Failed to resend OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-sm p-6 md:p-8 backdrop-blur-xl">
        <button
          onClick={() => navigate("/login")}
          className="absolute right-4 top-4 h-8 w-8 rounded-lg bg-background/80 text-foreground/60 hover:text-foreground hover:bg-background grid place-items-center transition-colors duration-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-foreground">Bookly</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground text-center">Verify OTP</h1>
        <p className="text-center text-sm text-foreground/70 mt-2">
          Enter your reset code sent to <span className="font-semibold">{email || "your email"}</span>
        </p>

        <form onSubmit={handleVerify} className="mt-5 space-y-4">
          <div className="flex items-center justify-center gap-2">
            {otpDigits.map((digit, idx) => (
              <div
                key={idx}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground text-lg font-bold grid place-items-center"
              >
                {digit || "•"}
              </div>
            ))}
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            className="w-full h-10 rounded-lg border border-border/50 bg-background px-4 text-center text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
            placeholder={`Enter ${OTP_LENGTH}-digit code`}
            required
          />

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-10 rounded-lg border border-border/50 bg-background px-4 text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
            placeholder="New password"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-10 rounded-lg border border-border/50 bg-background px-4 text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
            placeholder="Confirm new password"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-70 inline-flex items-center justify-center gap-2 transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify OTP"
            )}
          </button>
        </form>

        <div className="text-center mt-3 text-xs text-foreground/70">
          Didn&apos;t get code?{" "}
          <button type="button" onClick={() => void handleResend()} disabled={isLoading} className="font-semibold text-primary hover:text-primary/90 underline">
            Resend
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70 hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;
