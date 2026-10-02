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
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { SocialButtons } from "@/features/auth/SocialButtons";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";
import { useAfterSignIn } from "@/features/auth/useAfterSignIn";
import { applyApiErrors, withNext } from "@/lib/forms";

const FIELDS = ["name", "email", "phone", "password", "password_confirmation"] as const;

export default function RegisterPage() {
  const [params] = useSearchParams();
  const next = params.get("next");
  const afterSignIn = useAfterSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setError, control, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", password_confirmation: "" },
  });
  const { errors, isSubmitting } = formState;
  const password = useWatch({ control, name: "password" });

  const submit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      const response = await authApi.register({
        name: values.name,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
        ...(values.phone ? { phone: values.phone } : {}),
      });
      // New accounts are unverified, so this continues to /verify-email (which keeps `next`).
      afterSignIn(response.customer, next, undefined, { justRegistered: true });
    } catch (error) {
      const message = applyApiErrors(error, setError, FIELDS);
      if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    }
  };

  return (
    <AuthPage
      eyebrow="New to Bookly"
      title="Create your account"
      lead="Save books, check out faster and track every order."
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

        <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" hint="We'll send a 6-digit code to confirm it." error={errors.email?.message} {...register("email")} />
        <TextField label="Phone" optional type="tel" autoComplete="tel" inputMode="tel" placeholder="012 345 678" hint="For delivery questions only." error={errors.phone?.message} {...register("phone")} />

        <div className="grid gap-3">
          <PasswordField label="Password" autoComplete="new-password" aria-describedby="password-rules" error={errors.password?.message} {...register("password")} />
          <PasswordChecklist id="password-rules" value={password ?? ""} />
        </div>
        <PasswordField label="Confirm password" autoComplete="new-password" error={errors.password_confirmation?.message} {...register("password_confirmation")} />

        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Creating your account…" : "Create account"}
          </Button>
        </CtaGlare>

        <SocialButtons />
      </form>
    </AuthPage>
  );
}
