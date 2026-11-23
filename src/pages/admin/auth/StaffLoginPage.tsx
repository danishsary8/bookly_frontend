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
import { otherPortal, portalLabel, portalNext, portalPath, usePortal, type Portal } from "@/features/admin/portal";
import { toast } from "@/stores/toast";

/*
 * /admin/login and /staff/login: step 1 email + password; step 2 the 6-digit code
 * from the authenticator app (the challenge lives 5 minutes, in memory only).
 * Accounts without 2FA yet get a setup-only session and go to /{portal}/two-factor.
 * Strict portal check: admin accounts only sign in on /admin/login, staff accounts
 * only sign in on /staff/login.
 */
export default function StaffLoginPage({ portal }: { portal?: Portal } = {}) {
  const routePortal = usePortal();
  const activePortal = portal ?? routePortal;
  const altPortal = otherPortal(activePortal);
  const altLabel = portalLabel(altPortal);
  const [params] = useSearchParams();
  const next = params.get("next");
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [wrongPortalTarget, setWrongPortalTarget] = useState<Portal | null>(null);
  const [verifying, setVerifying] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setError, resetField, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const { errors, isSubmitting } = formState;

  const showError = (message: string, redirectPortal: Portal | null = null) => {
    setFormError(message);
    setWrongPortalTarget(redirectPortal);
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const rejectWrongRole = (role: Portal) => {
    const target: Portal = role === "admin" ? "admin" : "staff";
    const msg =
      target === "staff"
        ? "This is a staff account. Please sign in at the Staff portal instead."
        : "This is an administrator account. Please sign in at the Admin portal instead.";
    setChallenge(null);
    setCode("");
    resetField("password");
    showError(msg, target);
  };

  const submitPassword = async (values: LoginValues) => {
    setFormError(null);
    setWrongPortalTarget(null);
    try {
      const result = await staffAuthApi.login(values.email, values.password, activePortal);
      if (result.two_factor_required) {
        setChallenge(result.challenge_token);
        return;
      }
      if (result.staff.role !== activePortal) {
        rejectWrongRole(result.staff.role);
        return;
      }
      startStaffSession(result, result.staff);
      navigate(`${portalPath(activePortal, "two-factor")}${next ? `?next=${encodeURIComponent(next)}` : ""}`, { replace: true });
    } catch (error) {
      resetField("password");
      const apiError = ApiError.from(error);
      if (apiError.status === 403 && apiError.data.code === "wrong_portal") {
        const expected = apiError.data.expected_portal === "admin" ? "admin" : "staff";
        showError(apiError.message, expected);
        return;
      }
      const message = applyApiErrors(error, setError, ["email", "password"]);
      if (message) showError(message);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setCodeError("Enter the 6-digit code from your authenticator app.");
    setCodeError(undefined);
    setFormError(null);
    setWrongPortalTarget(null);
    setVerifying(true);
    try {
      const result = await staffAuthApi.challenge(challenge!, code);
      if (result.staff.role !== activePortal) {
        rejectWrongRole(result.staff.role);
        return;
      }
      startStaffSession(result, result.staff);
      toast.success(`Welcome back, ${result.staff.name.split(" ")[0]}`);
      navigate(portalNext(activePortal, next), { replace: true });
    } catch (error) {
      const apiError = ApiError.from(error);
      setCode("");
      if (apiError.status === 422) {
        setCodeError("That code didn't work. Codes change every 30 seconds: use the one showing now.");
        requestAnimationFrame(() => codeRef.current?.querySelector("input")?.focus());
      } else if (apiError.kind === "unauthenticated" || apiError.status === 429) {
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
      <StaffAuthFrame
        portal={activePortal}
        title="Enter your code"
        lead="Open your authenticator app and enter the 6-digit code for Bookly."
      >
        <form onSubmit={(event) => void submitCode(event)} noValidate className="grid gap-5">
          {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
          <div ref={codeRef}>
            <OtpInput value={code} onChange={setCode} label="Authentication code" error={codeError} autoFocus disabled={verifying} />
          </div>
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
      portal={activePortal}
      title={activePortal === "admin" ? "Admin sign in" : "Staff sign in"}
      lead={
        activePortal === "admin"
          ? "For Bookly administrators. Staff members should use the staff portal."
          : "For Bookly staff. Shopping? Use the customer sign in."
      }
      footer={
        <>
          <Link
            to={portalPath(altPortal, "login")}
            className="inline-flex min-h-10 items-center font-semibold text-primary underline-offset-4 hover:underline"
          >
            {activePortal === "admin" ? "Staff member? Go to Staff sign in" : "Administrator? Go to Admin sign in"}
          </Link>
          <Link to="/login" className="inline-flex min-h-10 items-center text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            Customer sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submitPassword)(event)} noValidate className="grid gap-5">
        {formError ? (
          <FormAlert ref={alertRef} title={formError}>
            {wrongPortalTarget ? (
              <Link
                to={portalPath(wrongPortalTarget, "login")}
                className="inline-flex font-semibold text-primary underline underline-offset-4"
              >
                Go to {portalLabel(wrongPortalTarget)} sign in →
              </Link>
            ) : null}
          </FormAlert>
        ) : null}
        <TextField label="Work email" type="email" autoComplete="username" inputMode="email" error={errors.email?.message} {...register("email")} />
        <div className="grid gap-1.5">
          <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <Link
            to={portalPath(activePortal, "reset-password")}
            className="inline-flex min-h-11 w-max items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Checking…" : "Continue"}
        </Button>
        <p className="sr-only">{altLabel} portal link available below.</p>
      </form>
    </StaffAuthFrame>
  );
}
