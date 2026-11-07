import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { AuthPage } from "@/features/auth/AuthPage";
import { AgreeNote } from "@/features/auth/AgreeNote";
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
import { toast } from "@/stores/toast";
import { useQuery } from "@tanstack/react-query";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { referralSignup } from "@/features/account/referralAttribution";

const FIELDS = ["name", "email", "phone", "password", "password_confirmation", "verify_by"] as const;
/** Which step shows each field, so a server error can send the person back to it. */
const STEP_FIELDS = [["name", "email", "phone", "verify_by"], ["password", "password_confirmation"]] as const;

export default function RegisterPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const afterSignIn = useAfterSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const { lang, dict } = useT();
  const s = dict.signin;
  const features = useQuery(shopFeaturesQuery());

  const [step, setStep] = useState(0);
  const { register, handleSubmit, setError, control, formState, trigger, getFieldState, getValues } = useForm<RegisterValues>({
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
        locale: lang,
        turnstile_token: await turnstile.getToken(),
        ...(features.data?.referrals ? referralSignup() : {}),
      });
      // New accounts are unverified, so this continues to the code page or Telegram (which keep `next`).
      if (response.pending_email) toast.info({ title: dict.security.pendingEmailTitle, description: dict.security.pendingEmailSent(response.pending_email) });
      afterSignIn(response.customer, next, undefined, { justRegistered: true, verifyBy: response.verify_by ?? "email" });
    } catch (error) {
      const message = applyApiErrors(error, setError, FIELDS);
      const back = STEP_FIELDS.findIndex((fields) => fields.some((field) => getFieldState(field).invalid));
      if (back >= 0) setStep(back);
      if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    } finally {
      turnstile.reset();
    }
  };

  const steps = [s.stepYou, dict.auth.password, s.stepConfirm];
  const goNext = async () => {
    setFormError(null);
    if (await trigger([...STEP_FIELDS[step]])) setStep(step + 1);
  };
  const values = getValues();

  return (
    <AuthPage
      eyebrow={s.newToBookly}
      title={s.createTitle}
      lead={s.createLead}
      panel={<LibraryCard name={name} channel={byTelegram ? "telegram" : "email"} destination={byTelegram ? null : email} />}
      footer={<AgreeNote />}
    >
      <form
        onSubmit={(event) => {
          if (step < 2) {
            event.preventDefault();
            void goNext();
            return;
          }
          void handleSubmit(submit)(event);
        }}
        noValidate
        className="grid gap-5"
      >
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        {anySocialEnabled() && step === 0 ? <SocialButtons next={next} /> : null}

        <Stepper
          steps={steps}
          current={step}
          label={s.signUpSteps}
          status={s.stepOf(step + 1, steps.length, steps[step])}
          footer={
            <>
              {step > 0 ? (
                <Button type="button" variant="ghost" size="lg" className="shrink-0 px-4" onClick={() => setStep(step - 1)}>
                  {s.stepBack}
                </Button>
              ) : null}
              {step < 2 ? (
                <Button type="submit" variant="cta" size="lg" className="flex-1">
                  {s.stepContinue}
                </Button>
              ) : (
                <CtaGlare block className="flex-1">
                  <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
                    {isSubmitting ? s.creating : s.create}
                  </Button>
                </CtaGlare>
              )}
            </>
          }
        >
          {step === 0 ? (
            <div className="grid gap-5">
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
            </div>
          ) : step === 1 ? (
            <div className="grid gap-5">
              <input type="email" name="username" autoComplete="username" value={email ?? ""} readOnly hidden />
              <div className="grid gap-3">
                <PasswordField label={dict.auth.password} autoComplete="new-password" aria-describedby="password-rules" error={errors.password?.message} {...register("password")} />
                <PasswordChecklist id="password-rules" value={password ?? ""} />
              </div>
              <PasswordField label={s.confirmPassword} autoComplete="new-password" error={errors.password_confirmation?.message} {...register("password_confirmation")} />
            </div>
          ) : (
            <div className="grid gap-5">
              <p className="text-sm text-muted-foreground">{s.reviewLead}</p>
              <dl className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm">
                {[
                  [s.fullName, values.name],
                  [dict.auth.email, values.email || "—"],
                  ...(byTelegram ? [] : [[s.phone, values.phone || "—"]]),
                  [s.verifyWith, byTelegram ? "Telegram" : dict.auth.email],
                ].map(([term, detail]) => (
                  <div key={term} className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">{term}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold text-foreground">{detail}</dd>
                  </div>
                ))}
              </dl>
              {turnstile.widget}
            </div>
          )}
        </Stepper>


        {anySocialEnabled() || step > 0 ? null : <SocialButtons next={next} />}
        <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          {dict.auth.alreadyHaveAccount}{" "}
          <Link to={withNext("/login", next)} className="font-semibold text-primary underline-offset-4 hover:underline">
            {dict.auth.signIn}
          </Link>
        </p>
      </form>
    </AuthPage>
  );
}
