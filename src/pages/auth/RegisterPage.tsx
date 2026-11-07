import { useEffect, useRef, useState } from "react";
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
import { ChannelPicker } from "@/features/auth/ChannelPicker";
import { LibraryCard } from "@/features/auth/LibraryCard";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { SocialButtons } from "@/features/auth/SocialButtons";
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
// One question per step: name → how we reach you → password → optional phone + review.
const STEP_FIELDS = [["name"], ["email", "verify_by"], ["password", "password_confirmation"], ["phone"]] as const;
const LAST = STEP_FIELDS.length - 1;

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
  const { register, handleSubmit, setError, control, formState, trigger, getFieldState, getValues, setValue } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", password_confirmation: "", verify_by: "email" },
  });
  const { errors, isSubmitting } = formState;
  const [password, name, email, channel] = useWatch({ control, name: ["password", "name", "email", "verify_by"] });
  const telegram = useTelegramBot();
  // One password box with a show/hide eye replaces "type it again"; the API still gets both fields.
  useEffect(() => setValue("password_confirmation", password ?? ""), [password, setValue]);
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

  const steps = [s.stepYou, s.stepContact, dict.auth.password, s.stepConfirm];
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
      legal
    >
      <form
        onSubmit={(event) => {
          if (step < LAST) {
            event.preventDefault();
            void goNext();
            return;
          }
          void handleSubmit(submit)(event);
        }}
        noValidate
        className="grid gap-4"
      >
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}

        <Stepper
          steps={steps}
          current={step}
          label={s.signUpSteps}
          status={s.stepOf(step + 1, steps.length, steps[step])}
          beforeFooter={turnstile.widget}
          footer={
            <>
              {step > 0 ? (
                <Button key="back" type="button" variant="ghost" size="lg" className="shrink-0 px-4" onClick={() => setStep(step - 1)}>
                  {s.stepBack}
                </Button>
              ) : null}
              {step < LAST ? (
                <Button key="continue" type="submit" variant="cta" size="lg" className="flex-1">
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
            <TextField label={s.fullName} autoComplete="name" error={errors.name?.message} {...register("name")} />
          ) : step === 1 ? (
            <div className="grid gap-5">
              {telegram ? <ChannelPicker value={byTelegram ? "telegram" : "email"} field={register("verify_by")} /> : null}
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
            </div>
          ) : step === 2 ? (
            <div className="grid gap-3">
              <input type="email" name="username" autoComplete="username" value={email ?? ""} readOnly hidden />
              <PasswordField label={dict.auth.password} autoComplete="new-password" aria-describedby="password-rules" error={errors.password?.message ?? errors.password_confirmation?.message} {...register("password")} />
              <PasswordChecklist id="password-rules" value={password ?? ""} />
            </div>
          ) : (
            <div className="grid gap-5">
              {/* Optional extras live on the last step, so the first one stays short. */}
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
              <dl className="grid gap-2.5 border-y border-border py-4 text-sm">
                {[
                  [s.fullName, values.name],
                  [dict.auth.email, values.email || "—"],
                  [s.verifyWith, byTelegram ? "Telegram" : dict.auth.email],
                ].map(([term, detail]) => (
                  <div key={term} className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">{term}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold text-foreground">{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Stepper>

        {step === 0 ? <SocialButtons next={next} /> : null}
        <p className="border-t border-border pt-3 text-center text-sm text-muted-foreground">
          {dict.auth.alreadyHaveAccount}{" "}
          <Link to={withNext("/login", next)} className="font-semibold text-primary underline-offset-4 hover:underline">
            {dict.auth.signIn}
          </Link>
        </p>
      </form>
    </AuthPage>
  );
}
