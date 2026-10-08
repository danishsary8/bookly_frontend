import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, RotateCcw } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, type VerifyChannel } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { CtaGlare } from "@/components/CtaGlare";
import { OtpInput } from "@/components/form/OtpInput";
import { FormAlert } from "@/components/form/FormAlert";
import { useSignOut } from "@/components/shell/useSignOut";
import { Button } from "@/components/ui/button";
import { AuthPage } from "@/features/auth/AuthPage";
import { LibraryCard, LibraryStrip } from "@/features/auth/LibraryCard";
import { ResendCode } from "@/features/auth/ResendCode";
import { TelegramWait } from "@/features/auth/TelegramWait";
import { verifyEmailSchema, type VerifyEmailValues } from "@/features/auth/schemas";
import { useTelegramLink } from "@/features/auth/telegram";
import { isVerified, rememberChannel, rememberedChannel, verifyPath } from "@/features/auth/verification";
import { applyApiErrors, safeNext } from "@/lib/forms";
import { toast } from "@/stores/toast";

/*
 * /verify-email?via=email|telegram (signed-in customers): the last sign-up step. The API requires a verified
 * account (email or phone) for cart, wishlist and checkout, so the catalogue and guards send people here,
 * and `next` returns them. The lapis panel shows the library card, which gets its gold "Member" stamp when
 * it's done.
 * - email: the 6-digit code from the sign-up email.
 * - telegram: "Open Telegram", then "Share my phone number" in the Bookly bot; the page notices by itself.
 *   `optional=1`: a Facebook customer whose email is already confirmed can skip this for now.
 */
const STAMP_MS = 900;

export default function VerifyEmailPage() {
  const user = useSession<Customer>("customer")?.user;
  const [params] = useSearchParams();
  const via = params.get("via");
  const channel: VerifyChannel =
    via === "email" || via === "telegram" ? via : (rememberedChannel() ?? (user?.email || !user?.phone ? "email" : "telegram"));
  return channel === "telegram" ? <TelegramConfirm /> : <EmailCode />;
}

function useVerifyParams() {
  const [params] = useSearchParams();
  return {
    next: params.get("next"),
    optional: params.get("optional") === "1",
    fromRegistration: (useLocation().state as { justRegistered?: boolean } | null)?.justRegistered ?? false,
  };
}

function TelegramConfirm() {
  const user = useSession<Customer>("customer")?.user;
  const { next, optional } = useVerifyParams();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const [stamped, setStamped] = useState(false);
  const [switching, setSwitching] = useState(false);
  const telegram = useTelegramLink("phone", () => {
    setStamped(true);
    toast.success({ title: "Phone number confirmed", description: "Welcome to the library: your cart and wishlist are ready." });
    window.setTimeout(() => navigate(safeNext(next), { replace: true }), STAMP_MS);
  });
  const { state, start } = telegram;

  // Already confirmed when the page opened (e.g. an old link): nothing to do here. Checked once, so the
  // session update that comes with a fresh confirmation doesn't skip the stamp.
  const [alreadyDone] = useState(() => Boolean(user?.phone_verified));
  // The link is ready before the customer taps, so "Open Telegram" opens the bot in one tap.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || alreadyDone) return;
    started.current = true;
    void start();
  }, [start, alreadyDone]);

  if (alreadyDone) return <Navigate to={safeNext(next)} replace />;

  /** "Get a code by email instead": a new email code, then this page on the email channel. */
  const switchToEmail = async () => {
    setSwitching(true);
    try {
      await authApi.resendVerification();
      rememberChannel("email");
      toast.success({ title: "Code sent by email", description: `Check ${user?.email ?? "your inbox"} (and the spam folder).` });
      navigate(verifyPath("email", next), { replace: true, state: { justRegistered: true } });
    } catch (error) {
      toast.error({ title: "Couldn't send the email", description: ApiError.from(error).message });
    } finally {
      setSwitching(false);
    }
  };

  const card = { name: user?.name, channel: "telegram" as const, destination: user?.phone_verified ? user.phone : null, sent: true, cardNumber: user?.id, stamped };

  return (
    <AuthPage
      eyebrow={optional ? "One more thing" : "One last step"}
      title="Confirm your phone number"
      lead={
        <p>
          Open the Bookly bot in Telegram and tap <strong className="font-semibold text-foreground">Share my phone number</strong>. Telegram sends us your number,
          so there's no code to type.
        </p>
      }
      panel={<LibraryCard {...card} />}
      footer={
        optional ? (
          <p>
            <Link to={safeNext(next)} replace className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
              Skip for now
            </Link>{" "}
            and confirm your number later in your account.
          </p>
        ) : (
          <p>
            Changed your mind?{" "}
            <Button variant="link" className="min-h-11 px-0 text-sm" onClick={() => void signOut()}>
              Sign out and start again
            </Button>
          </p>
        )
      }
    >
      <div className="grid gap-6">
        <LibraryStrip {...card} />
        {state.phase === "failed" ? (
          <div className="grid gap-4">
            <FormAlert title={state.message} />
            <Button type="button" variant="outline" onClick={() => void start()}>
              <RotateCcw aria-hidden="true" /> Try again
            </Button>
          </div>
        ) : state.phase === "waiting" ? (
          <TelegramWait url={state.link.url} primary />
        ) : (
          <CtaGlare block>
            <Button type="button" variant="cta" size="lg" className="w-full" loading>
              {stamped ? "Stamping your card…" : "Getting Telegram ready…"}
            </Button>
          </CtaGlare>
        )}
        {user?.email && !user.email_verified && !optional ? (
          <p className="text-sm text-muted-foreground">
            No Telegram?{" "}
            <Button type="button" variant="link" className="min-h-11 px-0 text-sm" onClick={() => void switchToEmail()} disabled={switching}>
              {switching ? "Sending…" : "Get a code by email instead"}
            </Button>
          </p>
        ) : null}
      </div>
    </AuthPage>
  );
}

function EmailCode() {
  const user = useSession<Customer>("customer")?.user;
  const { next, fromRegistration } = useVerifyParams();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const [stamped, setStamped] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  // The session updates (verified) a moment before the stamp shows; stay here for the stamp.
  const [checking, setChecking] = useState(false);

  const { control, handleSubmit, setError, formState } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: "" },
  });

  const done = user?.email ? Boolean(user.email_verified) : isVerified(user);
  if (done && !stamped && !checking) return <Navigate to={safeNext(next)} replace />;

  const destination = user?.email;

  const submit = async (values: VerifyEmailValues) => {
    setChecking(true);
    try {
      await authApi.verifyEmail(values.code);
      setStamped(true);
      toast.success({ title: "Email verified", description: "Welcome to the library: your cart and wishlist are ready." });
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

  const card = { name: user?.name, channel: "email" as const, destination, sent: true, cardNumber: user?.id, stamped };

  return (
    <AuthPage
      eyebrow="One last step"
      title="Check your email"
      lead={
        <p>
          We sent a 6-digit code to {destination ? <strong className="font-semibold text-foreground">{destination}</strong> : "your email address"}. Enter it below to finish
          setting up your account.
        </p>
      }
      panel={<LibraryCard {...card} />}
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
        <ResendCode send={(token) => authApi.resendVerification(token)} startCoolingDown={fromRegistration} turnstileAction="resend_code" />
      </form>
    </AuthPage>
  );
}
