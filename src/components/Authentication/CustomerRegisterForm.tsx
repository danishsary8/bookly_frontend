import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import authService from "../../services/auth.service";
import { setPendingWelcome } from "../../lib/customer";
import { alertToast } from "../../lib/alerts";

interface CustomerRegisterFormProps {
  onRegisterSuccess?: () => void;
}

const fieldClassName =
  "h-12 w-full rounded-2xl border border-border/60 bg-background/80 px-4 pl-11 text-sm text-foreground placeholder:text-foreground/45 outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

const CustomerRegisterForm = ({ onRegisterSuccess }: CustomerRegisterFormProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      alertToast.warning("Password mismatch", "Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address,
        password,
      });

      await authService.login({ email, password });
      setPendingWelcome(`Welcome, ${firstName}! Your account is ready.`);
      onRegisterSuccess?.();
      navigate("/");
    } catch (error: any) {
      alertToast.error("Registration failed", error?.response?.data?.message || "Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">First Name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
            <input
              type="text"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First name"
              className={fieldClassName}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Last Name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
            <input
              type="text"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Last name"
              className={fieldClassName}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Phone</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
            <input
              type="tel"
              value={phone}
              maxLength={25}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
              className={fieldClassName}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Address</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-foreground/38" />
          <textarea
            required
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Street address, city, district"
            className="min-h-[100px] w-full rounded-2xl border border-border/60 bg-background/80 px-4 pb-4 pl-11 pt-3 text-sm text-foreground placeholder:text-foreground/45 outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create password"
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

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Confirm Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
              className={fieldClassName}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
        <p className="text-sm font-semibold text-foreground">Account setup note</p>
        <p className="mt-1 text-sm leading-6 text-foreground/62">
          Your address and phone help us keep shipping updates and invoice records accurate from the start.
        </p>
      </div>

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
            Creating account...
          </>
        ) : (
          "Create Customer Account"
        )}
      </motion.button>
    </form>
  );
};

export default CustomerRegisterForm;
