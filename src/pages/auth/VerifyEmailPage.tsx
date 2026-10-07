import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, type VerifyChannel } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { CtaGlare } from "@/components/CtaGlare";
import { OtpInput } from "@/components/form/OtpInput";
import { useSignOut } from "@/components/shell/useSignOut";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { LibraryCard, LibraryStrip } from "@/features/auth/LibraryCard";
import { ResendCode } from "@/features/auth/ResendCode";
import { verifyEmailSchema, type VerifyEmailValues } from "@/features/auth/schemas";
import { isVerified, rememberChannel, rememberedChannel, verifyPath } from "@/features/auth/verification";
import { applyApiErrors, safeNext } from "@/lib/forms";
import { toast } from "@/stores/toast";

/*
 * /verify-email?via=email|telegram (signed-in customers): the 6-digit code from the sign-up email or from
 * Telegram. The API requires a verified account (email or phone) for cart, wishlist and checkout, so the
 * catalogue and guards send people here, and `next` returns them. The lapis panel shows the library card,
 * which gets its gold "Member" stamp when the code is right. `optional=1`: a Facebook customer whose email
 * is already confirmed can skip verifying their phone for now.
 */
const STAMP_MS = 900;

export default function VerifyEmailPage() {
  const session = useSession<Customer>("customer");
  const user = session?.user;
  const [params] = useSearchParams();
  const next = params.get("next");
  const optional = params.get("optional") === "1";
  const navigate = useNavigate();
  const signOut = useSignOut();
  const fromRegistration = (useLocation().state as { justRegistered?: boolean } | null)?.justRegistered ?? false;
  const [stamped, setStamped] = useState(false);
  const [switching, setSwitching] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  // The session updates (verified) a moment before the stamp shows; stay here for the stamp.
  const [checking, setChecking] = useState(false);

  const via = params.get("via");
  const channel: VerifyChannel =
    via === "email" || via === "telegram" ? via : (rememberedChannel() ?? (user?.email || !user?.phone ? "email" : "telegram"));

  const { control, handleSubmit, setError, formState, reset } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: "" },
  });

  const done = channel === "telegram" ? Boolean(user?.phone_verified) : channel === "email" && user?.email ? Boolean(user.email_verified) : isVerified(user);
  if (done && !stamped && !checking) return <Navigate to={safeNext(next)} replace />;

  const destination = channel === "telegram" ? user?.phone : user?.email;

  const submit = async (values: VerifyEmailValues) => {
    setChecking(true);
    try {
      await (channel === "telegram" ? authApi.verifyPhone(values.code) : authApi.verifyEmail(values.code));
      setStamped(true);
      toast.success(
        channel === "telegram"
          ? { title: "Phone number verified", description: "Welcome to the library: your cart and wishlist are ready." }
          : { title: "Email verified", description: "Welcome to the library: your cart and wishlist are ready." },
      );
      window.setTimeout(() => navigate(safeNext(next), { replace: true }), STAMP_MS);
    } catch (error) {
      setChecking(false);
      const message = applyApiErrors(error, setError, ["code"]);
      if (message) {
        // "The code is invalid or has expired." belongs to the code cells.
        setError("code", { type: "server", message });
        requestAnimationFrame(() => codeRef.current?.querySelector("input")?.focus());
      }
    }
  };

  /** "Send it by email instead": a new code by email, then this page on the email channel. */
  const switchToEmail = async () => {
    setSwitching(true);
    try {
      await authApi.resendVerification(undefined, "email");
      rememberChannel("email");
      reset();
      toast.success({ title: "Code sent by email", description: `Check ${user?.email ?? "your inbox"} (and the spam folder).` });
      navigate(verifyPath("email", next), { replace: true, state: { justRegistered: true } });
    } catch (error) {
      toast.error({ title: "Couldn't send the email", description: ApiError.from(error).message });
    } finally {
      setSwitching(false);
    }
  };

  const card = { name: user?.name, channel, destination, sent: true, cardNumber: user?.id, stamped };

  return (
    <AuthPage
      eyebrow={optional ? "One more thing" : "One last step"}
      title={channel === "telegram" ? "Check Telegram" : "Check your email"}
      lead={
        <p>
          {channel === "telegram" ? (
            <>
              We sent a 6-digit code to the Telegram account of {destination ? <strong className="font-semibold text-foreground">{destination}</strong> : "your phone number"}.
              Open Telegram and look for the <strong className="font-semibold text-foreground">Verification Codes</strong> chat.
            </>
          ) : (
            <>
              We sent a 6-digit code to {destination ? <strong className="font-semibold text-foreground">{destination}</strong> : "your email address"}. Enter it below to finish
              setting up your account.
            </>
          )}
        </p>
      }
      panel={<LibraryCard {...card} />}
      footer={
        optional ? (
          <p>
            <Link to={safeNext(next)} replace className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
              Skip for now
            </Link>{" "}
            and verify your number later in your account.
          </p>
        ) : (
          <p>
            {channel === "telegram" ? "Wrong number?" : "Wrong email address?"}{" "}
            <Button variant="link" className="min-h-11 px-0 text-sm" onClick={() => void signOut()}>
              Sign out and start again
            </Button>
          </p>
        )
      }
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-6">
        <LibraryStrip {...card} />
        <div ref={codeRef}>
          <Controller
            control={control}
            name="code"
            render={({ field, fieldState }) => (
              <OtpInput
                value={field.value}
                onChange={field.onChange}
                label="Verification code"
                error={fieldState.error?.message}
                hint="Codes expire after 15 minutes; ask for a new one if yours did."
                autoFocus
              />
            )}
          />
        </div>
        <CtaGlare block>
          <Button type="submit" variant="cta" size="lg" className="w-full" loading={formState.isSubmitting || stamped}>
            {formState.isSubmitting ? "Checking…" : stamped ? "Stamping your card…" : (
              <>
                <BadgeCheck aria-hidden="true" /> Verify and continue
              </>
            )}
          </Button>
        </CtaGlare>
        <div className="grid gap-1">
          <ResendCode
            key={channel}
            send={(token) => authApi.resendVerification(token, channel)}
            startCoolingDown={fromRegistration}
            turnstileAction="resend_code"
            sentMessage={channel === "telegram" ? "Check the Verification Codes chat in Telegram." : undefined}
          />
          {channel === "telegram" && user?.email && !optional ? (
            <p className="text-sm text-muted-foreground">
              No Telegram on this number?{" "}
              <Button type="button" variant="link" className="min-h-11 px-0 text-sm" onClick={() => void switchToEmail()} disabled={switching}>
                {switching ? "Sending…" : "Send it by email instead"}
              </Button>
            </p>
          ) : null}
        </div>
      </form>
    </AuthPage>
  );
}
