import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { OtpInput } from "@/components/form/OtpInput";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { ResendCode } from "@/features/auth/ResendCode";
import { forgetResetEmail, recallResetEmail } from "@/features/auth/resetEmail";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/schemas";
import { applyApiErrors, withNext } from "@/lib/forms";
import { useT } from "@/i18n";
import { Rich } from "@/i18n/Rich";

/*
 * Step 2 of 2: the emailed code and a new password, sent together (the API has
 * no separate code check, so a wrong code is reported on the code after submit).
 * A successful reset signs the customer out everywhere, so they sign in again.
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const navigate = useNavigate();
  const state = useLocation().state as { email?: string; justSent?: boolean } | null;
  const [knownEmail] = useState(() => state?.email || recallResetEmail());
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const { dict } = useT();
  const s = dict.signin;

  const { register, control, handleSubmit, setError, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: knownEmail, code: "", password: "", password_confirmation: "" },
  });
  const { errors, isSubmitting } = formState;
  const password = useWatch({ control, name: "password" });
  const email = useWatch({ control, name: "email" });

  const submit = async (values: ResetPasswordValues) => {
    setFormError(null);
    try {
      await authApi.resetPassword(values);
      forgetResetEmail();
      navigate(withNext("/login", next), { replace: true, state: { email: values.email, notice: s.passwordUpdated } });
    } catch (error) {
      const message = applyApiErrors(error, setError, ["email", "code", "password", "password_confirmation"]);
      if (message && /code/i.test(message)) {
        setError("code", { type: "server", message });
        requestAnimationFrame(() => codeRef.current?.querySelector("input")?.focus());
      } else if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    }
  };

  return (
    <AuthPage
      eyebrow={s.passwordHelp}
      title={s.resetTitle}
      lead={
        knownEmail ? (
          <p>
            <Rich text={s.resetLeadKnown(knownEmail)} strong="font-semibold text-foreground" />
          </p>
        ) : (
          <p>{s.resetLead}</p>
        )
      }
      footer={
        <p>
          {s.newCodeOther}{" "}
          <Link to={withNext("/forgot-password", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            {s.startOver}
          </Link>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        {knownEmail ? (
          <input type="hidden" autoComplete="username" {...register("email")} />
        ) : (
          <TextField label={dict.auth.email} type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
        )}
        <div ref={codeRef} className="grid gap-1">
          <Controller
            control={control}
            name="code"
            render={({ field, fieldState }) => (
              <OtpInput value={field.value} onChange={field.onChange} label={s.resetCode} error={fieldState.error?.message} autoFocus={Boolean(knownEmail)} />
            )}
          />
          {email ? <ResendCode send={(token) => authApi.forgotPassword(email, token)} startCoolingDown={state?.justSent} turnstileAction="forgot_password" /> : null}
        </div>
        <div className="grid gap-3">
          <PasswordField label={s.newPassword} autoComplete="new-password" aria-describedby="new-password-rules" error={errors.password?.message} {...register("password")} />
          <PasswordChecklist id="new-password-rules" value={password ?? ""} />
        </div>
        <PasswordField label={s.confirmNewPassword} autoComplete="new-password" error={errors.password_confirmation?.message} {...register("password_confirmation")} />
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? dict.ui.saving : s.saveNewPassword}
          </Button>
        </CtaGlare>
      </form>
    </AuthPage>
  );
}
