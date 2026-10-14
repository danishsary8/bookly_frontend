import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { SocialButtons } from "@/features/auth/SocialButtons";
import { anySocialEnabled } from "@/features/auth/social";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { useAfterSignIn } from "@/features/auth/useAfterSignIn";
import { useTelegramBot } from "@/features/auth/verification";
import { applyApiErrors, withNext } from "@/lib/forms";
import { useTurnstile } from "@/features/auth/turnstile";
import { useT } from "@/i18n";

type LoginState = { email?: string; notice?: string } | null;

export default function LoginPage() {
  const { dict } = useT();
  const s = dict.signin;
  const [params] = useSearchParams();
  const next = params.get("next");
  const state = useLocation().state as LoginState;
  const afterSignIn = useAfterSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setError, resetField, control, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state?.email ?? "", password: "" },
  });
  const { errors, isSubmitting } = formState;
  const email = useWatch({ control, name: "email" });
  const turnstile = useTurnstile("login");
  const telegram = useTelegramBot();
  // The buttons go above the email form whenever at least one of them works.
  const buttonsOnTop = anySocialEnabled() || telegram;

  const submit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const response = await authApi.login(values.email, values.password, await turnstile.getToken());
      const firstName = response.customer?.name?.split(" ")[0];
      afterSignIn(response.customer, next, firstName ? s.welcomeBackName(firstName) : s.welcomeBack);
    } catch (error) {
      const message = applyApiErrors(error, setError, ["email", "password"]);
      resetField("password");
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
      eyebrow={s.welcomeBack}
      title={dict.auth.signIn}
      lead={s.loginLead}
      footer={
        <>
          <p>
            {dict.auth.dontHaveAccount}{" "}
            <Link to={withNext("/register", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
              {dict.auth.signUp}
            </Link>
          </p>
          <Link to="/books" className="mx-auto inline-flex min-h-11 items-center font-semibold text-foreground underline-offset-4 hover:underline">
            {s.guest}
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-5">
        {state?.notice && !formError ? <FormAlert tone="success">{state.notice}</FormAlert> : null}
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        {buttonsOnTop ? <SocialButtons next={next} telegram={telegram} /> : null}

        <TextField label={dict.auth.email} type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" error={errors.email?.message} {...register("email")} />

        <div className="grid gap-1.5">
          <PasswordField label={dict.auth.password} autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <Link
            to={withNext("/forgot-password", next)}
            state={{ email: email?.trim() }}
            className="inline-flex min-h-11 w-max items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {dict.auth.forgotPassword}
          </Link>
        </div>

        {turnstile.widget}

        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? s.signingIn : dict.auth.signIn}
          </Button>
        </CtaGlare>

        {buttonsOnTop ? null : <SocialButtons next={next} />}
      </form>
    </AuthPage>
  );
}
