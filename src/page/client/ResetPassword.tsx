import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import authService from "../../services/auth.service";
import { alertToast } from "../../lib/alerts";
import { AuthShell } from "../../components/AuthShell";
import { Button } from "../../components/ui/button";
import { CtaGlare } from "../../components/CtaGlare";
import { FormAlert } from "../../components/form/FormAlert";
import { OtpInput } from "../../components/form/OtpInput";
import { PasswordField } from "../../components/form/Field";
import { forgetResetEmail, recallResetEmail, rememberResetEmail, resetErrorMessage } from "../../lib/passwordReset";

const CODE_LENGTH = 6;
const MIN_PASSWORD = 8;
const RESEND_COOLDOWN_S = 30;

/**
 * Password reset, screen 2 of 2: the emailed code plus the new password, sent together
 * to POST /customers/reset-password (the API has no separate code-check endpoint, so a
 * wrong code is reported against the code field after submit).
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = (location.state ?? {}) as { email?: string; justSent?: boolean };
  // Router state first, then a refresh-safe copy, then the legacy ?email= of old /verify-otp links.
  const [email] = useState(() => state.email || recallResetEmail() || searchParams.get("email") || "");

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ code?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(state.justSent ? RESEND_COOLDOWN_S : 0);
  const [isResending, setIsResending] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const codeGroupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (email) rememberResetEmail(email);
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const focusCode = () => codeGroupRef.current?.querySelector<HTMLInputElement>("input")?.focus();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next = {
      code: code.length === CODE_LENGTH ? "" : `Enter all ${CODE_LENGTH} digits from the email.`,
      password: password.length >= MIN_PASSWORD ? "" : `Use at least ${MIN_PASSWORD} characters.`,
      confirm: !confirm ? "Re-enter your new password." : confirm === password ? "" : "Passwords don't match.",
    };
    setErrors(next);
    setFormError("");
    if (next.code) return focusCode();
    if (next.password) return passwordRef.current?.focus();
    if (next.confirm) return confirmRef.current?.focus();

    setIsLoading(true);
    try {
      await authService.resetPassword(code, password);
      forgetResetEmail();
      navigate("/login", { replace: true, state: { email, notice: "Password updated. Sign in with your new password." } });
    } catch (error: any) {
      const status = error?.response?.status;
      const message: string = error?.response?.data?.message || "";
      if (status === 400 && /token/i.test(message)) {
        setErrors((prev) => ({ ...prev, code: "That code is wrong or has expired. Check the email, or send a new code." }));
        setCode("");
        requestAnimationFrame(focusCode);
      } else if (status === 422) {
        setErrors((prev) => ({ ...prev, password: `Use at least ${MIN_PASSWORD} characters.` }));
        passwordRef.current?.focus();
      } else {
        setFormError(resetErrorMessage(error, "We couldn't reset your password. Try again."));
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    try {
      await authService.forgotPassword(email);
      setCooldown(RESEND_COOLDOWN_S);
      setCode("");
      setErrors((prev) => ({ ...prev, code: undefined }));
      alertToast.success("New code sent", `Check ${email}. Only the newest code works.`);
    } catch (error) {
      setFormError(resetErrorMessage(error, "We couldn't send a new code. Try again."));
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <AuthShell>
        <p className="eyebrow">Step 2 of 2</p>
        <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">Enter your code</h1>
        <p className="mt-3 text-base text-muted-foreground">We need your email first so we know where the code went.</p>
        <Button asChild variant="default" size="lg" className="mt-8 w-full">
          <Link to="/forgot-password">Start password reset</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <p className="eyebrow">Step 2 of 2</p>
      <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">Choose a new password</h1>
      <p className="mt-3 text-base text-muted-foreground">
        If an account exists for <span className="font-semibold text-foreground">{email}</span>, we've emailed it a 6-digit code.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}

        <div ref={codeGroupRef} className="grid gap-2">
          <OtpInput value={code} onChange={(v) => { setCode(v); if (errors.code) setErrors((p) => ({ ...p, code: undefined })); }} error={errors.code} autoFocus />
          <div className="text-sm text-muted-foreground">
            Didn't get it?{" "}
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={cooldown > 0 || isResending}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {isResending ? "Sending…" : cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
            </button>
          </div>
        </div>

        <PasswordField
          ref={passwordRef}
          label="New password"
          name="new-password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => password && setErrors((p) => ({ ...p, password: password.length >= MIN_PASSWORD ? "" : `Use at least ${MIN_PASSWORD} characters.` }))}
          error={errors.password}
        />
        <PasswordField
          ref={confirmRef}
          label="Confirm new password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          onBlur={() => confirm && setErrors((p) => ({ ...p, confirm: confirm === password ? "" : "Passwords don't match." }))}
          error={errors.confirm}
        />

        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {isLoading ? "Updating password…" : "Update password"}
          </Button>
        </CtaGlare>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link to="/forgot-password" state={{ email }} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Start again
        </Link>
      </p>
    </AuthShell>
  );
};

export default ResetPassword;
