import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { ChannelPicker } from "@/features/auth/ChannelPicker";
import { LibraryCard } from "@/features/auth/LibraryCard";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { SocialButtons } from "@/features/auth/SocialButtons";
import { anySocialEnabled } from "@/features/auth/social";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";
import { useAfterSignIn } from "@/features/auth/useAfterSignIn";
import { applyApiErrors, withNext } from "@/lib/forms";
import { useTurnstile } from "@/features/auth/turnstile";
import { useTelegramBot } from "@/features/auth/verification";
import { useT } from "@/i18n";

const FIELDS = ["name", "email", "phone", "password", "password_confirmation", "verify_by"] as const;

export default function RegisterPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const afterSignIn = useAfterSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const { dict } = useT();
  const s = dict.signin;

  const { register, handleSubmit, setError, control, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", password_confirmation: "", verify_by: "email" },
  });
  const { errors, isSubmitting } = formState;
  const [password, name, email, channel] = useWatch({ control, name: ["password", "name", "email", "verify_by"] });
  const telegram = useTelegramBot();
  const byTelegram = telegram && channel === "telegram";
  const turnstile = useTurnstile("register");

  const submit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      const response = await authApi.register({
        name: values.name,
        ...(values.email ? { email: values.email } : {}),
        password: values.password,
        password_confirmation: values.password_confirmation,
        ...(values.phone && !byTelegram ? { phone: values.phone } : {}),
        verify_by: byTelegram ? "telegram" : "email",
        turnstile_token: await turnstile.getToken(),
      });
      // New accounts are unverified, so this continues to the code page or Telegram (which keep `next`).
      afterSignIn(response.customer, next, undefined, { justRegistered: true, verifyBy: response.verify_by ?? "email" });
    } catch (error) {
      const message = applyApiErrors(error, setError, FIELDS);
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
      eyebrow={s.newToBookly}
      title={s.createTitle}
      lead={s.createLead}
      panel={<LibraryCard name={name} channel={byTelegram ? "telegram" : "email"} destination={byTelegram ? null : email} />}
      footer={
        <p>
          {dict.auth.alreadyHaveAccount}{" "}
          <Link to={withNext("/login", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            {dict.auth.signIn}
          </Link>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        {anySocialEnabled() ? <SocialButtons next={next} /> : null}

        <TextField label={s.fullName} autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label={dict.auth.email}
          optional={byTelegram}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          hint={byTelegram ? s.emailHintTelegram : s.emailHintCode}
          error={errors.email?.message}
          {...register("email")}
        />
        {telegram ? <ChannelPicker value={byTelegram ? "telegram" : "email"} field={register("verify_by")} /> : null}
        {byTelegram ? null : (
          <TextField
            label={s.phone}
            optional
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="012 345 678"
            hint={s.phoneHint}
            error={errors.phone?.message}
            {...register("phone")}
          />
        )}

        <div className="grid gap-3">
          <PasswordField label={dict.auth.password} autoComplete="new-password" aria-describedby="password-rules" error={errors.password?.message} {...register("password")} />
          <PasswordChecklist id="password-rules" value={password ?? ""} />
        </div>
        <PasswordField label={s.confirmPassword} autoComplete="new-password" error={errors.password_confirmation?.message} {...register("password_confirmation")} />

        {turnstile.widget}

        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? s.creating : s.create}
          </Button>
        </CtaGlare>

        {anySocialEnabled() ? null : <SocialButtons next={next} />}
      </form>
    </AuthPage>
  );
}
