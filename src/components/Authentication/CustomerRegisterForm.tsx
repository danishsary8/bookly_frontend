import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import authService from "../../services/auth.service";
import { setPendingWelcome } from "../../lib/customer";
import { alertToast } from "../../lib/alerts";
import { Button } from "../ui/button";
import { CtaGlare } from "../CtaGlare";
import { FormAlert } from "../form/FormAlert";
import { PasswordField, TextAreaField, TextField } from "../form/Field";

interface CustomerRegisterFormProps {
  /** Supplied when the form is embedded in a modal: the caller closes it; no navigation happens. */
  onRegisterSuccess?: () => void;
}

type FieldName = "firstName" | "lastName" | "email" | "phone" | "address" | "password" | "confirmPassword";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8; // Backend Validator::password minimum.

const validate = (field: FieldName, values: Values): string => {
  const value = values[field].trim();
  switch (field) {
    case "firstName":
      return value ? "" : "Enter your first name.";
    case "lastName":
      return value ? "" : "Enter your last name.";
    case "email":
      if (!value) return "Enter your email address.";
      return EMAIL_PATTERN.test(value) ? "" : "Enter an email address like name@example.com.";
    case "phone":
      return value.length > 25 ? "Use 25 characters or fewer." : "";
    case "address":
      return value ? "" : "Enter your delivery address.";
    case "password":
      return values.password.length >= MIN_PASSWORD ? "" : `Use at least ${MIN_PASSWORD} characters.`;
    case "confirmPassword":
      if (!values.confirmPassword) return "Re-enter your password.";
      return values.confirmPassword === values.password ? "" : "Passwords don't match.";
  }
};

const FIELD_ORDER: FieldName[] = ["firstName", "lastName", "email", "phone", "address", "password", "confirmPassword"];

const CustomerRegisterForm = ({ onRegisterSuccess }: CustomerRegisterFormProps) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>({ firstName: "", lastName: "", email: "", phone: "", address: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [formError, setFormError] = useState<{ title: string; showSignIn?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const update = (field: FieldName) => (event: { target: { value: string } }) => {
    const next = { ...values, [field]: event.target.value };
    setValues(next);
    // Once a field has been left, re-check it live so the error clears as soon as it's fixed.
    if (touched[field]) setErrors((prev) => ({ ...prev, [field]: validate(field, next) }));
    if (field === "password" && touched.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validate("confirmPassword", next) }));
    }
  };

  const blur = (field: FieldName) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (values[field] || field === "confirmPassword") setErrors((prev) => ({ ...prev, [field]: validate(field, values) }));
  };

  const fieldProps = (field: FieldName) => ({
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => { refs.current[field] = el; },
    value: values[field],
    onChange: update(field),
    onBlur: blur(field),
    error: errors[field],
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors = {};
    FIELD_ORDER.forEach((field) => { nextErrors[field] = validate(field, values); });
    setErrors(nextErrors);
    setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));
    setFormError(null);
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) return refs.current[firstInvalid]?.focus();

    const email = values.email.trim();
    setIsLoading(true);

    // Step 1: create the account. A failure here really is a registration failure.
    try {
      await authService.register({
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        email,
        phone: values.phone.trim(),
        address: values.address.trim(),
        password: values.password,
      });
    } catch (error: any) {
      setIsLoading(false);
      const status = error?.response?.status;
      const message: string = error?.response?.data?.message || "";
      if (status === 409) {
        setErrors((prev) => ({ ...prev, email: "An account with this email already exists." }));
        setFormError({ title: "You already have an account with this email.", showSignIn: true });
      } else if (status === 422 && /password/i.test(message)) {
        setErrors((prev) => ({ ...prev, password: `Use at least ${MIN_PASSWORD} characters.` }));
        setFormError({ title: "Check the highlighted field." });
      } else if (!error?.response) {
        setFormError({ title: "We couldn't reach Bookly. Check your connection and try again." });
      } else {
        setFormError({ title: message || "We couldn't create your account. Try again." });
      }
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    // Step 2: sign the new account in. If only this fails, the account still exists:
    // say so, and hand the user to Sign in with their email filled in.
    try {
      await authService.login({ email, password: values.password });
    } catch {
      setIsLoading(false);
      alertToast.success("Account created", "Please sign in to continue.");
      navigate("/login", { state: { email, notice: "Your account is ready. Sign in to continue." } });
      return;
    }

    setIsLoading(false);
    if (onRegisterSuccess) {
      onRegisterSuccess();
    } else {
      setPendingWelcome(`Welcome, ${values.firstName.trim()}! Your account is ready.`);
      navigate("/", { replace: true });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      {formError ? (
        <FormAlert ref={alertRef} title={formError.title}>
          {formError.showSignIn ? (
            <Link to="/login" state={{ email: values.email.trim() }} className="font-semibold underline underline-offset-4 hover:decoration-2">
              Sign in instead
            </Link>
          ) : null}
        </FormAlert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="First name" name="given-name" autoComplete="given-name" {...fieldProps("firstName")} />
        <TextField label="Last name" name="family-name" autoComplete="family-name" {...fieldProps("lastName")} />
      </div>
      <TextField label="Email" type="email" name="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...fieldProps("email")} />
      <TextField label="Phone" type="tel" name="tel" autoComplete="tel" inputMode="tel" optional hint="For delivery updates." {...fieldProps("phone")} />
      <TextAreaField label="Delivery address" name="street-address" autoComplete="street-address" hint="Street, district and city. We'll pre-fill it at checkout." {...fieldProps("address")} />
      <PasswordField label="Password" name="new-password" autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters.`} {...fieldProps("password")} />
      <PasswordField label="Confirm password" name="confirm-password" autoComplete="new-password" {...fieldProps("confirmPassword")} />

      <CtaGlare block>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isLoading ? "Creating account…" : "Create account"}
        </Button>
      </CtaGlare>
    </form>
  );
};

export default CustomerRegisterForm;
