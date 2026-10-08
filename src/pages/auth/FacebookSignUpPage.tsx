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
import { ChannelPicker } from "@/features/auth/ChannelPicker";
import { LibraryCard } from "@/features/auth/LibraryCard";
import type { FacebookSignUpState } from "@/features/auth/SocialButtons";
import { facebookDetailsSchema, type FacebookDetailsValues } from "@/features/auth/schemas";
import { useTurnstile } from "@/features/auth/turnstile";
import { useAfterSignIn } from "@/features/auth/useAfterSignIn";
import { applyApiErrors, withNext } from "@/lib/forms";

/*
 * /sign-up/facebook: a new Facebook customer's second step (owner's rule). Facebook has signed them in;
 * Bookly needs a proven phone number: one tap in the Bookly Telegram bot (next page). Without Telegram they
 * give an email instead and get a code there. The Facebook token lives in this page's memory only;
 * reloading starts again from "Continue with Facebook".
 */
export default function FacebookSignUpPage() {
  const state = useLocation().state as FacebookSignUpState | null;
  if (!state?.accessToken) return <Navigate to="/register" replace />;
  return <FacebookDetailsForm {...state} />;
}

function FacebookDetailsForm({ accessToken, profile, telegram, next }: FacebookSignUpState) {
  const afterSignIn = useAfterSignIn();
  const turnstile = useTurnstile("facebook_sign_up");
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setError, control, formState } = useForm<FacebookDetailsValues>({
    resolver: zodResolver(facebookDetailsSchema),
    defaultValues: { verify_by: telegram ? "telegram" : "email", email: profile.email ?? "" },
  });
  const { errors, isSubmitting } = formState;
  const [channel, email] = useWatch({ control, name: ["verify_by", "email"] });
  const byTelegram = telegram && channel === "telegram";
  const firstName = profile.name?.split(" ")[0];

  const submit = async (values: FacebookDetailsValues) => {
    setFormError(null);
    try {
      const response = await authApi.social("facebook", accessToken, {
        verify_by: byTelegram ? "telegram" : "email",
        ...(values.email ? { email: values.email } : {}),
        turnstile_token: await turnstile.getToken(),
      });
      afterSignIn(response.customer, next, firstName ? `Welcome, ${firstName}` : "Welcome to Bookly", { verifyBy: response.verify_by ?? null, justRegistered: true });
    } catch (error) {
      const message = applyApiErrors(error, setError, ["verify_by", "email"]);
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
      title={telegram ? "Confirm your phone number" : "Add your email"}
      lead={
        <p>
          {profile.name ? (
            <>
              Facebook signed you in as <strong className="font-semibold text-foreground">{profile.name}</strong>.{" "}
            </>
          ) : null}
          {telegram
            ? "Bookly needs a phone number for deliveries: share yours in our Telegram bot with one tap. No Telegram? Use your email instead."
            : "Add your email so we can confirm your account and send your receipts."}
        </p>
      }
      panel={<LibraryCard name={profile.name} channel={byTelegram ? "telegram" : "email"} destination={byTelegram ? null : email} />}
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
        {telegram ? <ChannelPicker value={byTelegram ? "telegram" : "email"} field={register("verify_by")} legend="How should we confirm your account?" /> : null}
        <TextField
          label="Email"
          optional={byTelegram}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          hint={
            profile.email
              ? "From Facebook. Keep it for receipts and order updates, or change it."
              : byTelegram
                ? "For receipts and order updates. You can add it later."
                : "We'll send a 6-digit code to confirm it."
          }
          error={errors.email?.message}
          {...register("email")}
        />
        {turnstile.widget}
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Finishing…" : byTelegram ? "Continue to Telegram" : "Finish signing up"}
          </Button>
        </CtaGlare>
      </form>
    </AuthPage>
  );
}
