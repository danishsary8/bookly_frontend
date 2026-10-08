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
import { useTelegramCodes } from "@/features/auth/verification";

const FIELDS = ["name", "email", "phone", "password", "password_confirmation", "verify_by"] as const;

export default function RegisterPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const afterSignIn = useAfterSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setError, control, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", password_confirmation: "", verify_by: "email" },
  });
  const { errors, isSubmitting } = formState;
  const [password, name, email, phone, channel] = useWatch({ control, name: ["password", "name", "email", "phone", "verify_by"] });
  const telegramCodes = useTelegramCodes();
  const byTelegram = telegramCodes && channel === "telegram";
  const turnstile = useTurnstile("register");

  const submit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      const response = await authApi.register({
        name: values.name,
        ...(values.email ? { email: values.email } : {}),
        password: values.password,
        password_confirmation: values.password_confirmation,
        ...(values.phone ? { phone: values.phone } : {}),
        verify_by: byTelegram ? "telegram" : "email",
        turnstile_token: await turnstile.getToken(),
      });
      // New accounts are unverified, so this continues to the code page (which keeps `next`).
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
      eyebrow="New to Bookly"
      title="Create your account"
      lead="Save books, check out faster and track every order."
      panel={<LibraryCard name={name} channel={byTelegram ? "telegram" : "email"} destination={byTelegram ? phone : email} />}
      footer={
        <p>
          Already have an account?{" "}
          <Link to={withNext("/login", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        {anySocialEnabled() ? <SocialButtons next={next} /> : null}

        <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Email"
          optional={byTelegram}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          hint={byTelegram ? "For receipts and order updates. You can add it later." : "We'll send a 6-digit code to confirm it."}
          error={errors.email?.message}
          {...register("email")}
        />
        {telegramCodes ? <ChannelPicker value={byTelegram ? "telegram" : "email"} field={register("verify_by")} /> : null}
        <TextField
          label={byTelegram ? "Phone number with Telegram" : "Phone"}
          optional={!byTelegram}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="012 345 678"
          hint={byTelegram ? "Cambodian numbers (+855). Your code arrives in Telegram's Verification Codes chat." : "For delivery questions only."}
          error={errors.phone?.message}
          {...register("phone")}
        />

        <div className="grid gap-3">
          <PasswordField label="Password" autoComplete="new-password" aria-describedby="password-rules" error={errors.password?.message} {...register("password")} />
          <PasswordChecklist id="password-rules" value={password ?? ""} />
        </div>
        <PasswordField label="Confirm password" autoComplete="new-password" error={errors.password_confirmation?.message} {...register("password_confirmation")} />

        {turnstile.widget}

        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Creating your account…" : "Create account"}
          </Button>
        </CtaGlare>

        {anySocialEnabled() ? null : <SocialButtons next={next} />}
      </form>
    </AuthPage>
  );
}
