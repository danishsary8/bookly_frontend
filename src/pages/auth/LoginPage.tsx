import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { SocialButtons, TELEGRAM_ICON } from "@/features/auth/SocialButtons";
import { anySocialEnabled } from "@/features/auth/social";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { useAfterSignIn } from "@/features/auth/useAfterSignIn";
import { openTelegram, useTelegramLink } from "@/features/auth/telegram";
import { TelegramWait } from "@/features/auth/TelegramWait";
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
  const [mode, setMode] = useState<"email" | "phone">("email");
  const alertRef = useRef<HTMLDivElement>(null);
  const buttonsOnTop = anySocialEnabled();

  const { register, handleSubmit, setError, resetField, control, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state?.email ?? "", password: "" },
  });
  const { errors, isSubmitting } = formState;
  const email = useWatch({ control, name: "email" });
  const turnstile = useTurnstile("login");
  const telegram = useTelegramBot();

  const telegramLink = useTelegramLink("login", (customer) => {
    const firstName = customer.name?.split(" ")[0];
    afterSignIn(customer, next, firstName ? s.welcomeBackName(firstName) : s.welcomeBack);
  });
  const telegramState = telegramLink.state;
  const telegramError = telegramState.phase === "failed" ? telegramState.message : null;

  const startTelegram = async () => {
    setFormError(null);
    const link = await telegramLink.start();
    if (link) openTelegram(link.url);
  };

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
      <div className="grid gap-5">
        {state?.notice && !formError && !telegramError ? <FormAlert tone="success">{state.notice}</FormAlert> : null}
        {formError || telegramError ? <FormAlert ref={alertRef} title={formError ?? telegramError ?? undefined} /> : null}
        {buttonsOnTop ? <SocialButtons next={next} /> : null}

        {mode === "email" ? (
          <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-5">
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

            {telegram ? (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setMode("phone");
                  }}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {s.signInWithPhone}
                </button>
              </div>
            ) : null}

            {buttonsOnTop ? null : <SocialButtons next={next} />}
          </form>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{s.phoneSignInLead}</p>
              {telegramState.phase === "waiting" ? (
                <TelegramWait url={telegramState.link.url} signIn onCancel={telegramLink.cancel} />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 text-[15px] font-semibold"
                  onClick={() => void startTelegram()}
                  disabled={telegramState.phase === "starting"}
                >
                  {telegramState.phase === "starting" ? (
                    <Loader2 className="size-[18px] animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    TELEGRAM_ICON
                  )}
                  {s.continueWith("Telegram")}
                </Button>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  telegramLink.cancel();
                  setFormError(null);
                  setMode("email");
                }}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {s.signInWithEmail}
              </button>
            </div>

            {buttonsOnTop ? null : <SocialButtons next={next} />}
          </div>
        )}
      </div>
    </AuthPage>
  );
}
