import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { staffAuthApi } from "@/api/endpoints/staff";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { OtpInput } from "@/components/form/OtpInput";
import { Button } from "@/components/ui/button";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { ResendCode } from "@/features/auth/ResendCode";
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordValues, type ResetPasswordValues } from "@/features/auth/schemas";
import { StaffAuthFrame } from "@/features/admin/StaffAuthFrame";
import { applyApiErrors } from "@/lib/forms";
import { toast } from "@/stores/toast";

const backToSignIn = (
  <Link to="/admin/login" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
    Back to staff sign in
  </Link>
);

/*
 * /admin/reset-password: email → 6-digit code + new password, on one page.
 * Two-step verification stays on after a reset (the API's rule): a reset email
 * alone never opens a staff account.
 */
export default function StaffResetPasswordPage() {
  const navigate = useNavigate();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const ask = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });
  const reset = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { email: "", code: "", password: "", password_confirmation: "" } });
  const password = useWatch({ control: reset.control, name: "password" });

  const showError = (message: string) => {
    setFormError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const sendCode = async ({ email }: ForgotPasswordValues) => {
    setFormError(null);
    try {
      await staffAuthApi.forgotPassword(email);
      setSentTo(email);
      reset.setValue("email", email);
    } catch (error) {
      const message = applyApiErrors(error, ask.setError, ["email"]);
      if (message) showError(message);
    }
  };

  const save = async (values: ResetPasswordValues) => {
    setFormError(null);
    try {
      await staffAuthApi.resetPassword(values);
      toast.success({ title: "Password updated", description: "Sign in with your new password and your authenticator code." });
      navigate("/admin/login", { replace: true });
    } catch (error) {
      const message = applyApiErrors(error, reset.setError, ["code", "password", "password_confirmation"]);
      if (message && /code/i.test(message)) reset.setError("code", { type: "server", message });
      else if (message) showError(message);
    }
  };

  if (!sentTo) {
    return (
      <StaffAuthFrame title="Reset your password" lead="Enter your work email and we'll send you a 6-digit code." footer={backToSignIn}>
        <form onSubmit={(event) => void ask.handleSubmit(sendCode)(event)} noValidate className="grid gap-5">
          {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
          <TextField label="Work email" type="email" autoComplete="username" inputMode="email" error={ask.formState.errors.email?.message} {...ask.register("email")} />
          <Button type="submit" size="lg" className="w-full" loading={ask.formState.isSubmitting}>
            Send code
          </Button>
        </form>
      </StaffAuthFrame>
    );
  }

  return (
    <StaffAuthFrame
      title="Set a new password"
      lead={
        <p>
          If <strong className="font-semibold text-foreground">{sentTo}</strong> is a staff account, we've sent it a code. It expires in 15 minutes.
        </p>
      }
      footer={backToSignIn}
    >
      <form onSubmit={(event) => void reset.handleSubmit(save)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <input type="hidden" autoComplete="username" {...reset.register("email")} />
        <div className="grid gap-1">
          <Controller
            control={reset.control}
            name="code"
            render={({ field, fieldState }) => <OtpInput value={field.value} onChange={field.onChange} label="Reset code" error={fieldState.error?.message} autoFocus />}
          />
          <ResendCode send={() => staffAuthApi.forgotPassword(sentTo)} startCoolingDown />
        </div>
        <div className="grid gap-3">
          <PasswordField label="New password" autoComplete="new-password" aria-describedby="staff-password-rules" error={reset.formState.errors.password?.message} {...reset.register("password")} />
          <PasswordChecklist id="staff-password-rules" value={password ?? ""} />
        </div>
        <PasswordField label="Confirm new password" autoComplete="new-password" error={reset.formState.errors.password_confirmation?.message} {...reset.register("password_confirmation")} />
        <Button type="submit" size="lg" className="w-full" loading={reset.formState.isSubmitting}>
          Save new password
        </Button>
      </form>
    </StaffAuthFrame>
  );
}
