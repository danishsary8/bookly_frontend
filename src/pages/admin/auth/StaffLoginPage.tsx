import { useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { staffAuthApi } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { OtpInput } from "@/components/form/OtpInput";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { StaffAuthFrame } from "@/features/admin/StaffAuthFrame";
import { startStaffSession } from "@/features/admin/staffSession";
import { applyApiErrors } from "@/lib/forms";
import { adminNext } from "@/features/admin/adminNext";
import { toast } from "@/stores/toast";

/*
 * /admin/login: step 1 email + password; step 2 the 6-digit code from the
 * authenticator app (the challenge lives 5 minutes, in memory only). Staff without
 * 2FA yet get a setup-only session and go to /admin/two-factor.
 */
export default function StaffLoginPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setError, resetField, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const { errors, isSubmitting } = formState;

  const showError = (message: string) => {
    setFormError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const submitPassword = async (values: LoginValues) => {
    setFormError(null);
    try {
      const result = await staffAuthApi.login(values.email, values.password);
      if (result.two_factor_required) {
        setChallenge(result.challenge_token);
        return;
      }
      startStaffSession(result, result.staff);
      navigate(`/admin/two-factor${next ? `?next=${encodeURIComponent(next)}` : ""}`, { replace: true });
    } catch (error) {
      resetField("password");
      const message = applyApiErrors(error, setError, ["email", "password"]);
      if (message) showError(message);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setCodeError("Enter the 6-digit code from your authenticator app.");
    setCodeError(undefined);
    setFormError(null);
    setVerifying(true);
    try {
      const result = await staffAuthApi.challenge(challenge!, code);
      startStaffSession(result, result.staff);
      toast.success(`Welcome back, ${result.staff.name.split(" ")[0]}`);
      navigate(adminNext(next), { replace: true });
    } catch (error) {
      const apiError = ApiError.from(error);
      setCode("");
      if (apiError.status === 422) setCodeError("That code didn't work. Codes change every 30 seconds: use the one showing now.");
      else if (apiError.kind === "unauthenticated" || apiError.status === 429) {
        // Expired attempt or too many wrong codes: start again from the password.
        setChallenge(null);
        showError(apiError.message);
      } else showError(apiError.message);
    } finally {
      setVerifying(false);
    }
  };

  if (challenge) {
    return (
      <StaffAuthFrame title="Enter your code" lead="Open your authenticator app and enter the 6-digit code for Bookly.">
        <form onSubmit={(event) => void submitCode(event)} noValidate className="grid gap-5">
          {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
          <OtpInput value={code} onChange={setCode} label="Authentication code" error={codeError} autoFocus disabled={verifying} />
          <Button type="submit" size="lg" className="w-full" loading={verifying}>
            {verifying ? "Checking…" : "Verify and sign in"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setChallenge(null);
              setCode("");
              setCodeError(undefined);
            }}
          >
            Use a different account
          </Button>
        </form>
      </StaffAuthFrame>
    );
  }

  return (
    <StaffAuthFrame
      title="Staff sign in"
      lead="For Bookly staff. Shopping? Use the customer sign in."
      footer={
        <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Customer sign in
        </Link>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submitPassword)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <TextField label="Work email" type="email" autoComplete="username" inputMode="email" error={errors.email?.message} {...register("email")} />
        <div className="grid gap-1.5">
          <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <Link to="/admin/reset-password" className="inline-flex min-h-11 w-max items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Checking…" : "Continue"}
        </Button>
      </form>
    </StaffAuthFrame>
  );
}
