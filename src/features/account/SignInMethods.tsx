import { useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CircleAlert, KeyRound, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { accountKeys } from "@/api/endpoints/account";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import type { Customer } from "@/api/types";
import { TextField } from "@/components/form/Field";
import { OtpInput } from "@/components/form/OtpInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Row } from "@/features/account/SecurityRow";
import { SocialConnection } from "@/features/account/SocialConnection";
import { phoneSchema, verifyEmailSchema, type PhoneValues, type VerifyEmailValues } from "@/features/auth/schemas";
import { useTurnstile } from "@/features/auth/turnstile";
import { rememberChannel, useTelegramCodes, verifyPath } from "@/features/auth/verification";
import { applyApiErrors } from "@/lib/forms";
import { toast } from "@/stores/toast";

/*
 * Account → Sign-in & security: every way into this account at a glance (email, phone, Google, Facebook,
 * password) and what each one still needs. Google and Facebook connect and disconnect here (SocialConnection). The phone is verified here with a Telegram code; a new number
 * replaces the old one only once its code comes back.
 */

const Verified = ({ children = "Verified" }: { children?: ReactNode }) => (
  <Badge tone="success" shape="tint">
    <BadgeCheck aria-hidden="true" /> {children}
  </Badge>
);
const NotVerified = () => (
  <Badge tone="warning" shape="tint">
    <CircleAlert aria-hidden="true" /> Not verified
  </Badge>
);

export function SignInMethods({ customer }: { customer: Customer | undefined }) {
  const navigate = useNavigate();
  const telegramCodes = useTelegramCodes();
  const [editingPhone, setEditingPhone] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const verifiedPhone = customer?.phone_verified ? customer.phone : null;

  const verifyEmail = async () => {
    setSendingEmail(true);
    try {
      await authApi.resendVerification(undefined, "email");
      rememberChannel("email");
      navigate(verifyPath("email", "/account/security"), { state: { justRegistered: true } });
    } catch (error) {
      toast.error({ title: "Couldn't send the code", description: ApiError.from(error).message });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <section aria-labelledby="sign-in-methods" className="grid max-w-xl gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id="sign-in-methods" className="font-display text-[1.563rem] leading-tight">
          Ways into your account
        </h2>
        <p className="text-[15px] text-muted-foreground">A verified email or phone number lets you order. Keep at least one up to date.</p>
      </div>
      <ul className="divide-y divide-border">
        <Row
          icon={<Mail className="size-5" aria-hidden="true" />}
          label="Email"
          value={customer?.email ?? <span className="text-muted-foreground">Not added</span>}
          status={customer?.email ? customer.email_verified ? <Verified /> : <NotVerified /> : null}
          action={
            customer?.email && !customer.email_verified ? (
              <Button variant="outline" size="sm" onClick={() => void verifyEmail()} loading={sendingEmail}>
                Verify
              </Button>
            ) : null
          }
        />
        <Row
          icon={<Phone className="size-5" aria-hidden="true" />}
          label="Phone"
          value={verifiedPhone ?? customer?.phone ?? <span className="text-muted-foreground">Not added</span>}
          status={verifiedPhone ? <Verified>Verified with Telegram</Verified> : customer?.phone ? <NotVerified /> : null}
          action={
            telegramCodes && !editingPhone ? (
              <Button variant="outline" size="sm" onClick={() => setEditingPhone(true)}>
                {verifiedPhone ? "Change" : customer?.phone ? "Verify" : "Add"}
              </Button>
            ) : null
          }
        >
          {editingPhone ? (
            <PhoneVerifier initial={verifiedPhone ? "" : (customer?.phone ?? "")} onDone={() => setEditingPhone(false)} />
          ) : !telegramCodes && !verifiedPhone ? (
            <p className="text-sm text-muted-foreground">Checking phone numbers with a Telegram code is coming soon.</p>
          ) : null}
        </Row>
        <SocialConnection provider="google" customer={customer} />
        <SocialConnection provider="facebook" customer={customer} />
        <Row
          icon={<KeyRound className="size-5" aria-hidden="true" />}
          label="Password"
          value={customer?.has_password === false ? <span className="text-muted-foreground">Not set</span> : "Set"}
          action={
            <Button variant="link" size="sm" className="px-0" asChild>
              <a href="#password">{customer?.has_password === false ? "Set one" : "Change"}</a>
            </Button>
          }
        />
      </ul>
    </section>
  );
}

/** Two steps in place: the number (Telegram code sent), then the code. */
function PhoneVerifier({ initial, onDone }: { initial: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const turnstile = useTurnstile("verify_phone");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const phoneForm = useForm<PhoneValues>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: initial } });
  const codeForm = useForm<VerifyEmailValues>({ resolver: zodResolver(verifyEmailSchema), defaultValues: { code: "" } });

  const send = async (values: PhoneValues) => {
    try {
      const response = await authApi.sendPhoneCode(values.phone, await turnstile.getToken());
      setSentTo(response.phone ?? values.phone);
      toast.success({ title: "Code sent", description: "Check the Verification Codes chat in Telegram." });
    } catch (error) {
      const message = applyApiErrors(error, phoneForm.setError, ["phone"]);
      if (message) phoneForm.setError("phone", { type: "server", message });
    } finally {
      turnstile.reset();
    }
  };

  const verify = async (values: VerifyEmailValues) => {
    try {
      await authApi.verifyPhone(values.code);
      await queryClient.invalidateQueries({ queryKey: accountKeys.me() });
      toast.success({ title: "Phone number verified", description: "You can use it for deliveries and to prove it's you." });
      onDone();
    } catch (error) {
      const message = applyApiErrors(error, codeForm.setError, ["code"]);
      if (message) {
        codeForm.setError("code", { type: "server", message });
        requestAnimationFrame(() => codeRef.current?.querySelector("input")?.focus());
      }
    }
  };

  if (sentTo) {
    return (
      <form onSubmit={(event) => void codeForm.handleSubmit(verify)(event)} noValidate className="grid gap-4 rounded-lg bg-surface-2 p-4">
        <p className="text-[15px]">
          Enter the code Telegram sent to <strong className="font-semibold">{sentTo}</strong>.
        </p>
        <div ref={codeRef}>
          <Controller
            control={codeForm.control}
            name="code"
            render={({ field, fieldState }) => <OtpInput value={field.value} onChange={field.onChange} label="Telegram code" error={fieldState.error?.message} autoFocus />}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={codeForm.formState.isSubmitting}>
            Verify number
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSentTo(null)}>
            Use another number
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void phoneForm.handleSubmit(send)(event)} noValidate className="grid gap-4 rounded-lg bg-surface-2 p-4">
      <TextField
        label="Phone number with Telegram"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="012 345 678"
        hint="Cambodian numbers (+855). We'll send a 6-digit code to its Telegram."
        error={phoneForm.formState.errors.phone?.message}
        {...phoneForm.register("phone")}
      />
      {turnstile.widget}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={phoneForm.formState.isSubmitting}>
          Send code
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
