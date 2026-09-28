import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import authService from "../../services/auth.service";
import { AuthShell } from "../../components/AuthShell";
import { Button } from "../../components/ui/button";
import { CtaGlare } from "../../components/CtaGlare";
import { FormAlert } from "../../components/form/FormAlert";
import { TextField } from "../../components/form/Field";
import { rememberResetEmail, resetErrorMessage } from "../../lib/passwordReset";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Password reset, screen 1 of 2: ask for the email and send a 6-digit code. */
const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(((location.state ?? {}) as { email?: string }).email ?? "");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const validate = (value: string) => {
    if (!value.trim()) return "Enter the email you use to sign in.";
    return EMAIL_PATTERN.test(value.trim()) ? "" : "Enter an email address like name@example.com.";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validate(email);
    setEmailError(error);
    setFormError("");
    if (error) return emailRef.current?.focus();

    const address = email.trim();
    setIsLoading(true);
    try {
      await authService.forgotPassword(address);
      rememberResetEmail(address);
      navigate("/reset-password", { state: { email: address, justSent: true } });
    } catch (err) {
      setFormError(resetErrorMessage(err, "We couldn't send a code. Try again."));
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <p className="eyebrow">Step 1 of 2</p>
      <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">Reset your password</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Enter the email on your account and we'll send you a 6-digit code.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <TextField
          ref={emailRef}
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(validate(event.target.value));
          }}
          onBlur={() => email && setEmailError(validate(email))}
          error={emailError}
        />
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {isLoading ? "Sending code…" : "Send code"}
          </Button>
        </CtaGlare>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link to="/login" state={{ email: email.trim() }} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default ForgotPassword;
