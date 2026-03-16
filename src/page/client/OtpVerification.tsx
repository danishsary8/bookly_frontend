import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, X } from "lucide-react";
import authService from "../../services/auth.service";

const OtpVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpDigits = [0, 1, 2, 3].map((idx) => otp[idx] || "");

  const mapErrorMessage = (err: any, fallback: string) => {
    const backendMessage: string = err?.response?.data?.message || "";
    if (backendMessage.toLowerCase().includes("smtp is not configured")) {
      return "Email service is not configured. Please set MAIL_* in backend .env.";
    }
    return backendMessage || fallback;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError("Missing email. Please retry forgot password.");
      return;
    }

    if (otp.length < 4) {
      setError("Please enter a valid 4-digit OTP.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(otp, newPassword);
      setSuccessMessage("Password reset successful. Please login.");
      setTimeout(() => navigate("/login"), 900);
    } catch (err: any) {
      setError(mapErrorMessage(err, "OTP verification failed."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Missing email. Please retry forgot password.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccessMessage("OTP resent to your email.");
    } catch (err: any) {
      setError(mapErrorMessage(err, "Failed to resend OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-orange-100 px-4 py-8 relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-72 h-72 bg-orange-300/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-amber-300/25 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md bg-white/90 border border-white/80 rounded-3xl shadow-[0_24px_60px_rgba(15,23,42,0.2)] p-6 md:p-8 backdrop-blur-xl">
        <button
          onClick={() => navigate("/login")}
          className="absolute right-4 top-4 h-8 w-8 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 grid place-items-center"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-slate-900">Bookly</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 text-center">Verify OTP</h1>
        <p className="text-center text-sm text-slate-600 mt-1">
          Enter your reset code sent to <span className="font-semibold">{email || "your email"}</span>
        </p>

        <form onSubmit={handleVerify} className="mt-5 space-y-4">
          <div className="flex items-center justify-center gap-2">
            {otpDigits.map((digit, idx) => (
              <div
                key={idx}
                className="h-10 w-10 rounded-xl bg-slate-900 text-white text-lg font-bold grid place-items-center"
              >
                {digit || "•"}
              </div>
            ))}
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-center text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300/40"
            placeholder="Enter 4-digit code"
            required
          />

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300/40"
            placeholder="New password"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300/40"
            placeholder="Confirm new password"
            required
          />

          {error && <p className="text-xs text-red-600 text-center font-semibold">{error}</p>}
          {successMessage && <p className="text-xs text-emerald-700 text-center font-semibold">{successMessage}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:opacity-90 disabled:opacity-70 inline-flex items-center justify-center gap-2"
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

        <div className="text-center mt-3 text-xs text-slate-600">
          Didn&apos;t get code?{" "}
          <button type="button" onClick={handleResend} disabled={isLoading} className="font-semibold text-orange-600 underline">
            Resend
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;
