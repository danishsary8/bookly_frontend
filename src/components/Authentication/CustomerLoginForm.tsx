import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import authService from "../../services/auth.service";
import { Button } from "../ui/button";
import { CtaGlare } from "../CtaGlare";
import { FormAlert } from "../form/FormAlert";
import { PasswordField, TextField } from "../form/Field";

interface CustomerLoginFormProps {
  /** Supplied when the form is embedded in a modal: the caller closes it; no navigation happens. */
  onLoginSuccess?: () => void;
}

interface LoginLocationState {
  email?: string;
  notice?: string;
  from?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (value: string) => {
  if (!value.trim()) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(value.trim())) return "Enter an email address like name@example.com.";
  return "";
};

const loginErrorMessage = (error: any) => {
  const status = error?.response?.status;
  if (status === 401) return "Email or password is incorrect.";
  if (status === 429) return "Too many sign-in attempts. Wait 15 minutes, then try again.";
  if (!error?.response) return "We couldn't reach Bookly. Check your connection and try again.";
  return error?.response?.data?.message || "Sign-in didn't work. Try again.";
};

const CustomerLoginForm = ({ onLoginSuccess }: CustomerLoginFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LoginLocationState;
  const isEmbedded = Boolean(onLoginSuccess);

  const [email, setEmail] = useState(state.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      password: password ? "" : "Enter your password.",
    };
    setErrors(nextErrors);
    setFormError("");
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setIsLoading(true);
    try {
      await authService.login({ email: email.trim(), password });
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate(state.from && state.from.startsWith("/") ? state.from : "/", { replace: true });
      }
    } catch (error) {
      setFormError(loginErrorMessage(error));
      setPassword("");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      {state.notice && !formError && !isEmbedded ? <FormAlert tone="success">{state.notice}</FormAlert> : null}
      {formError ? <FormAlert ref={alertRef} title={formError} /> : null}

      <TextField
        ref={emailRef}
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => email && setErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
        error={errors.email}
        placeholder="name@example.com"
      />

      <div className="grid gap-1.5">
        <PasswordField
          ref={passwordRef}
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <Link
          to="/forgot-password"
          state={{ email: email.trim() }}
          className="inline-flex min-h-11 w-max items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <CtaGlare block>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </CtaGlare>
    </form>
  );
};

export default CustomerLoginForm;
