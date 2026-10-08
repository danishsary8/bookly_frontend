import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { OtpInput } from "@/components/form/OtpInput";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { ResendCode } from "@/features/auth/ResendCode";
import { phoneSchema, verifyEmailSchema, type PhoneValues, type VerifyEmailValues } from "@/features/auth/schemas";
import { useTurnstile } from "@/features/auth/turnstile";
import { useAfterSignIn } from "@/features/auth/useAfterSignIn";
import { applyApiErrors, withNext } from "@/lib/forms";

/*
 * /login/phone: sign in with a verified phone number and a Telegram code. Step 1 sends the code; the API
 * says on the number when it has no account or Telegram can't reach it, so nobody waits for a code that
 * never comes. Step 2 signs in like a password and goes back to ?next=.
 */
export default function PhoneLoginPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const afterSignIn = useAfterSignIn();
  const turnstile = useTurnstile("phone_login");
  const [phone, setPhone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const phoneForm = useForm<PhoneValues>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: "" } });
  const codeForm = useForm<VerifyEmailValues>({ resolver: zodResolver(verifyEmailSchema), defaultValues: { code: "" } });

  const showError = (message: string) => {
    setFormError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const send = async (values: PhoneValues) => {
    setFormError(null);
    try {
      const response = await authApi.phoneLogin(values.phone, await turnstile.getToken());
      setPhone(response.phone ?? values.phone);
      codeForm.reset();
    } catch (error) {
      const message = applyApiErrors(error, phoneForm.setError, ["phone"]);
      if (message) showError(message);
    } finally {
      turnstile.reset();
    }
  };

  const signIn = async (values: VerifyEmailValues) => {
    if (!phone) return;
    setFormError(null);
    try {
      const response = await authApi.phoneLoginVerify(phone, values.code);
      const firstName = response.customer?.name?.split(" ")[0];
      afterSignIn(response.customer, next, firstName ? `Welcome back, ${firstName}` : "Welcome back");
    } catch (error) {
      const message = applyApiErrors(error, codeForm.setError, ["code"]);
      if (message) showError(message);
      else requestAnimationFrame(() => codeRef.current?.querySelector("input")?.focus());
    }
  };

  const footer = (
    <>
      <p>
        Prefer your email?{" "}
        <Link to={withNext("/login", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Sign in with email
        </Link>
      </p>
      <p>
        New to Bookly?{" "}
        <Link to={withNext("/register", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );

  if (phone) {
    return (
      <AuthPage
        eyebrow="Welcome back"
        title="Check Telegram"
        lead={
          <p>
            We sent a 6-digit code to the Telegram account of <strong className="font-semibold text-foreground">{phone}</strong>. Open Telegram and look for the{" "}
            <strong className="font-semibold text-foreground">Verification Codes</strong> chat.
          </p>
        }
        footer={footer}
      >
        <form onSubmit={(event) => void codeForm.handleSubmit(signIn)(event)} noValidate className="grid gap-6">
          {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
          <div ref={codeRef}>
            <Controller
              control={codeForm.control}
              name="code"
              render={({ field, fieldState }) => (
                <OtpInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Telegram code"
                  error={fieldState.error?.message}
                  hint="Codes expire after 15 minutes."
                  autoFocus
                />
              )}
            />
          </div>
          <CtaGlare block>
            <Button type="submit" variant="cta" size="lg" className="w-full" loading={codeForm.formState.isSubmitting}>
              {codeForm.formState.isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </CtaGlare>
          <div className="grid gap-1">
            <ResendCode
              send={(token) => authApi.phoneLogin(phone, token)}
              startCoolingDown
              turnstileAction="phone_login"
              sentMessage="Check the Verification Codes chat in Telegram."
            />
            <p className="text-sm text-muted-foreground">
              Wrong number?{" "}
              <Button type="button" variant="link" className="min-h-11 px-0 text-sm" onClick={() => setPhone(null)}>
                Use another number
              </Button>
            </p>
          </div>
        </form>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      eyebrow="Welcome back"
      title="Sign in with your phone"
      lead={<p>We'll send a 6-digit code to your number's Telegram. It works with the number you verified on your Bookly account.</p>}
      footer={footer}
    >
      <form onSubmit={(event) => void phoneForm.handleSubmit(send)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <TextField
          label="Phone number"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="012 345 678"
          hint="Cambodian numbers (+855)."
          error={phoneForm.formState.errors.phone?.message}
          {...phoneForm.register("phone")}
        />
        {turnstile.widget}
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={phoneForm.formState.isSubmitting}>
            {phoneForm.formState.isSubmitting ? "Sending…" : "Send code"}
          </Button>
        </CtaGlare>
      </form>
    </AuthPage>
  );
}
