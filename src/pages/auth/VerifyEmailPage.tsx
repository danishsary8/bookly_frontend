import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { CtaGlare } from "@/components/CtaGlare";
import { FormAlert } from "@/components/form/FormAlert";
import { OtpInput } from "@/components/form/OtpInput";
import { useSignOut } from "@/components/shell/useSignOut";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { ResendCode } from "@/features/auth/ResendCode";
import { verifyEmailSchema, type VerifyEmailValues } from "@/features/auth/schemas";
import { applyApiErrors, safeNext } from "@/lib/forms";
import { toast } from "@/stores/toast";

/*
 * /verify-email (signed-in, unverified customers): the 6-digit code from the
 * registration email. The API requires a verified email for cart, wishlist and
 * checkout, so the catalogue and guards send people here, and `next` returns them.
 */
export default function VerifyEmailPage() {
  const session = useSession<Customer>("customer");
  const [params] = useSearchParams();
  const next = params.get("next");
  const navigate = useNavigate();
  const signOut = useSignOut();
  const fromRegistration = (useLocation().state as { justRegistered?: boolean } | null)?.justRegistered ?? false;
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  const { control, handleSubmit, setError, formState } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: "" },
  });

  if (session?.user?.email_verified) return <Navigate to={safeNext(next)} replace />;

  const submit = async (values: VerifyEmailValues) => {
    setFormError(null);
    try {
      await authApi.verifyEmail(values.code);
      toast.success({ title: "Email verified", description: "You're all set: your cart and wishlist are ready." });
      navigate(safeNext(next), { replace: true });
    } catch (error) {
      const message = applyApiErrors(error, setError, ["code"]);
      if (message) {
        // "The code is invalid or has expired." belongs to the code cells.
        setError("code", { type: "server", message });
        requestAnimationFrame(() => codeRef.current?.querySelector("input")?.focus());
      }
    }
  };

  const email = session?.user?.email;

  return (
    <AuthPage
      eyebrow="One last step"
      title="Check your email"
      lead={
        <p>
          We sent a 6-digit code to {email ? <strong className="font-semibold text-foreground">{email}</strong> : "your email address"}. Enter it below to finish setting up your account.
        </p>
      }
      footer={
        <p>
          Wrong email address?{" "}
          <Button variant="link" className="min-h-11 px-0 text-sm" onClick={() => void signOut()}>
            Sign out and start again
          </Button>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-6">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <div ref={codeRef}>
          <Controller
            control={control}
            name="code"
            render={({ field, fieldState }) => (
              <OtpInput value={field.value} onChange={field.onChange} label="Verification code" error={fieldState.error?.message} hint="The code expires after a while; ask for a new one if it does." autoFocus />
            )}
          />
        </div>
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={formState.isSubmitting}>
            {formState.isSubmitting ? "Checking…" : (
              <>
                <MailCheck aria-hidden="true" /> Verify email
              </>
            )}
          </Button>
        </CtaGlare>
        <ResendCode send={authApi.resendVerification} startCoolingDown={fromRegistration} />
      </form>
    </AuthPage>
  );
}
