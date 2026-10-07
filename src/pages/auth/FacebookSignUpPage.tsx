import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { CtaGlare } from "@/components/CtaGlare";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { LibraryCard } from "@/features/auth/LibraryCard";
import type { FacebookSignUpState } from "@/features/auth/SocialButtons";
import { facebookDetailsSchema, type FacebookDetailsValues } from "@/features/auth/schemas";
import { useTurnstile } from "@/features/auth/turnstile";
import { useAfterSignIn } from "@/features/auth/useAfterSignIn";
import { applyApiErrors, withNext } from "@/lib/forms";

/*
 * /sign-up/facebook: a new Facebook customer's second step (owner's rule). Facebook has signed them in;
 * Bookly needs their Cambodian phone number, and an email only if they want receipts by email. The
 * Facebook token lives in this page's memory only; reloading starts again from "Continue with Facebook".
 */
export default function FacebookSignUpPage() {
  const state = useLocation().state as FacebookSignUpState | null;
  if (!state?.accessToken) return <Navigate to="/register" replace />;
  return <FacebookDetailsForm {...state} />;
}

function FacebookDetailsForm({ accessToken, profile, telegramCodes, next }: FacebookSignUpState) {
  const afterSignIn = useAfterSignIn();
  const turnstile = useTurnstile("facebook_sign_up");
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setError, control, formState } = useForm<FacebookDetailsValues>({
    resolver: zodResolver(facebookDetailsSchema),
    defaultValues: { phone: "", email: profile.email ?? "" },
  });
  const { errors, isSubmitting } = formState;
  const phone = useWatch({ control, name: "phone" });
  const firstName = profile.name?.split(" ")[0];

  const submit = async (values: FacebookDetailsValues) => {
    setFormError(null);
    try {
      const response = await authApi.social("facebook", accessToken, {
        phone: values.phone,
        ...(values.email ? { email: values.email } : {}),
        turnstile_token: await turnstile.getToken(),
      });
      afterSignIn(response.customer, next, firstName ? `Welcome, ${firstName}` : "Welcome to Bookly", { verifyBy: response.verify_by ?? null, justRegistered: true });
    } catch (error) {
      const message = applyApiErrors(error, setError, ["phone", "email"]);
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
      eyebrow="Almost a member"
      title="Add your phone number"
      lead={
        <p>
          {profile.name ? (
            <>
              Facebook signed you in as <strong className="font-semibold text-foreground">{profile.name}</strong>.{" "}
            </>
          ) : null}
          Bookly needs a phone number for deliveries{telegramCodes ? ", and we'll confirm it with a code in Telegram." : "."}
        </p>
      }
      panel={<LibraryCard name={profile.name} channel="telegram" destination={phone} />}
      footer={
        <p>
          Not you?{" "}
          <Link to={withNext("/login", next)} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            Sign in another way
          </Link>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-5">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <TextField
          label="Phone number"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="012 345 678"
          hint={telegramCodes ? "Cambodian numbers (+855). Use the number that has Telegram." : "Cambodian numbers (+855)."}
          error={errors.phone?.message}
          {...register("phone")}
        />
        <TextField
          label="Email"
          optional
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          hint={profile.email ? "From Facebook. Keep it for receipts and order updates, or clear it." : "For receipts and order updates."}
          error={errors.email?.message}
          {...register("email")}
        />
        {turnstile.widget}
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Finishing…" : "Finish signing up"}
          </Button>
        </CtaGlare>
      </form>
    </AuthPage>
  );
}
