import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Smartphone } from "lucide-react";
import { AgreeNote } from "@/features/auth/AgreeNote";
import { Stepper } from "@/components/ui/stepper";
import { authApi } from "@/api/endpoints/auth";
import type { Customer } from "@/api/types";
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
import { PhoneCodeSignIn } from "@/features/auth/PhoneCodeSignIn";
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

  // Two steps, like Apple/Google: email first, then password. A remembered email starts on the password step.
  const [step, setStep] = useState(state?.email ? 1 : 0);
  const { register, handleSubmit, setError, resetField, control, formState, trigger, getFieldState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state?.email ?? "", password: "" },
  });
  const { errors, isSubmitting } = formState;
  const email = useWatch({ control, name: "email" });
  const turnstile = useTurnstile("login");
  const telegram = useTelegramBot();

  const welcome = (customer: Customer) => {
    const firstName = customer.name?.split(" ")[0];
    afterSignIn(customer, next, firstName ? s.welcomeBackName(firstName) : s.welcomeBack);
  };
  const telegramLink = useTelegramLink("login", welcome);
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
      if (getFieldState("email").invalid) setStep(0);
      if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    } finally {
      turnstile.reset();
    }
  };

  const continueToPassword = async () => {
    setFormError(null);
    if (await trigger("email")) setStep(1);
  };
  const steps = [s.stepEmail, dict.auth.password];

  return (
    <AuthPage
      eyebrow={s.welcomeBack}
      title={dict.auth.signIn}
      lead={s.loginLead}
      footer={
        <>
          <Link to="/books" className="group mx-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
            {s.guest}
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <AgreeNote />
        </>
      }
    >
      <div className="grid gap-5">
        {state?.notice && !formError && !telegramError ? <FormAlert tone="success">{state.notice}</FormAlert> : null}
        {formError || telegramError ? <FormAlert ref={alertRef} title={formError ?? telegramError ?? undefined} /> : null}
        {buttonsOnTop && (mode !== "email" || step === 0) ? <SocialButtons next={next} /> : null}

        {mode === "email" ? (
          <form
            onSubmit={(event) => {
              if (step === 0) {
                event.preventDefault();
                void continueToPassword();
                return;
              }
              void handleSubmit(submit)(event);
            }}
            noValidate
          >
            <Stepper
              steps={steps}
              current={step}
              label={s.signInSteps}
              status={s.stepOf(step + 1, steps.length, steps[step])}
              beforeFooter={turnstile.widget}
              footer={
                step === 0 ? (
                  <Button type="submit" variant="cta" size="lg" className="w-full">
                    {s.stepContinue}
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="ghost" size="lg" className="shrink-0 px-4" onClick={() => setStep(0)}>
                      {s.stepBack}
                    </Button>
                    <CtaGlare block className="flex-1">
                      <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
                        {isSubmitting ? s.signingIn : dict.auth.signIn}
                      </Button>
                    </CtaGlare>
                  </>
                )
              }
            >
              {step === 0 ? (
                <TextField label={dict.auth.email} type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" error={errors.email?.message} {...register("email")} />
              ) : (
                <div className="grid gap-5">
                  {/* Who is signing in, with a way back to change it. The hidden username helps password managers. */}
                  <div className="flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display text-base text-primary-foreground" aria-hidden="true">
                      {(email?.trim()[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{email}</span>
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {s.stepChange}
                    </button>
                  </div>
                  <input type="email" name="username" autoComplete="username" value={email ?? ""} readOnly hidden />

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
                </div>
              )}
            </Stepper>
          </form>
        ) : null}
        {mode === "email" && step === 0 ? (
          <div className="grid gap-3">
            {telegram ? (
              <>
                {/* Common "or" divider, then a quiet secondary option styled like the social buttons. */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  {s.or}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setMode("phone");
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Smartphone className="size-4 text-muted-foreground" aria-hidden="true" />
                  {s.signInWithPhone}
                </button>
              </>
            ) : null}
            {buttonsOnTop ? null : <SocialButtons next={next} />}
          </div>
        ) : null}
        {mode === "email" ? null : (
          <div className="grid gap-4">
            <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{s.phoneSignInLead}</p>
              <PhoneCodeSignIn onSignedIn={welcome} />
            </div>

            <div className="grid gap-3">
              <p className="text-center text-sm text-muted-foreground">{s.noMessage}</p>
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
        {/* Second path, inside the card where people look for it. */}
        <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          {dict.auth.dontHaveAccount}{" "}
          <Link to={withNext("/register", next)} className="font-semibold text-primary underline-offset-4 hover:underline">
            {dict.auth.signUp}
          </Link>
        </p>
      </div>
    </AuthPage>
  );
}

