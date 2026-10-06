import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { rememberResetEmail } from "@/features/auth/resetEmail";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/schemas";
import { applyApiErrors, withNext } from "@/lib/forms";
import { useTurnstile } from "@/features/auth/turnstile";

/* Step 1 of 2: ask for a reset code by email. The API answers the same way whether or not the email exists. */
export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const navigate = useNavigate();
  const prefill = (useLocation().state as { email?: string } | null)?.email ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setError, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: prefill },
  });

  const turnstile = useTurnstile("forgot_password");

  const submit = async ({ email }: ForgotPasswordValues) => {
    setFormError(null);
    try {
      await authApi.forgotPassword(email, await turnstile.getToken());
      rememberResetEmail(email);
      navigate(withNext("/reset-password", next), { state: { email, justSent: true } });
    } catch (error) {
      const message = applyApiErrors(error, setError, ["email"]);
      if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    } finally {
      turnstile.reset();
    }
  };

  return (
    <AuthPage
      eyebrow="Password help"
      title="Forgot your password?"
      lead="Enter the email you signed up with and we'll send you a 6-digit code to set a new one."
      footer={
        <p>
          Remembered it?{" "}
          <Link to={withNext("/login", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" error={formState.errors.email?.message} {...register("email")} />
        {turnstile.widget}
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={formState.isSubmitting}>
            {formState.isSubmitting ? "Sending code…" : "Send reset code"}
          </Button>
        </CtaGlare>
      </form>
    </AuthPage>
  );
}
