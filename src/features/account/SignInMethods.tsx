import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CircleAlert, KeyRound, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { accountKeys } from "@/api/endpoints/account";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import type { Customer } from "@/api/types";
import { FormAlert } from "@/components/form/FormAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailChanger } from "@/features/account/EmailChanger";
import { Row } from "@/features/account/SecurityRow";
import { SocialConnection } from "@/features/account/SocialConnection";
import { useTelegramLink } from "@/features/auth/telegram";
import { TelegramWait } from "@/features/auth/TelegramWait";
import { rememberChannel, useTelegramBot, verifyPath } from "@/features/auth/verification";
import { toast } from "@/stores/toast";

/*
 * Account → Sign-in & security: every way into this account at a glance (email, phone, Google, Facebook,
 * password) and what each one still needs. Google and Facebook connect and disconnect here (SocialConnection);
 * the email is added or changed with a code to the new address (EmailChanger). The phone is confirmed (or
 * changed) by sharing it in the Bookly Telegram bot (PhoneInTelegram); the old number stays until then.
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
  const telegram = useTelegramBot();
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const verifiedPhone = customer?.phone_verified ? customer.phone : null;

  const verifyEmail = async () => {
    setSendingEmail(true);
    try {
      await authApi.resendVerification();
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
            editingEmail ? null : (
              <div className="flex flex-wrap gap-2">
                {customer?.email && !customer.email_verified ? (
                  <Button variant="outline" size="sm" onClick={() => void verifyEmail()} loading={sendingEmail}>
                    Verify
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => setEditingEmail(true)}>
                  {customer?.email ? "Change" : "Add"}
                </Button>
              </div>
            )
          }
        >
          {editingEmail ? <EmailChanger current={customer?.email ?? null} hasPassword={customer?.has_password !== false} onDone={() => setEditingEmail(false)} /> : null}
        </Row>
        <Row
          icon={<Phone className="size-5" aria-hidden="true" />}
          label="Phone"
          value={verifiedPhone ?? customer?.phone ?? <span className="text-muted-foreground">Not added</span>}
          status={verifiedPhone ? <Verified>Verified with Telegram</Verified> : customer?.phone ? <NotVerified /> : null}
          action={
            telegram && !editingPhone ? (
              <Button variant="outline" size="sm" onClick={() => setEditingPhone(true)}>
                {verifiedPhone ? "Change" : "Confirm"}
              </Button>
            ) : null
          }
        >
          {editingPhone ? (
            <PhoneInTelegram onDone={() => setEditingPhone(false)} />
          ) : telegram && verifiedPhone ? (
            <p className="text-sm text-muted-foreground">You can also sign in with Continue with Telegram.</p>
          ) : telegram ? (
            <p className="text-sm text-muted-foreground">Confirm it with one tap in our Telegram bot: it shares the number of your Telegram account.</p>
          ) : !verifiedPhone ? (
            <p className="text-sm text-muted-foreground">Confirming phone numbers in Telegram is coming soon.</p>
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

/**
 * Confirm or change the number in place: the bot link is made straight away, so "Open Telegram" opens the
 * bot in one tap; the row updates by itself once the number is shared.
 */
function PhoneInTelegram({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { state, start } = useTelegramLink("phone", (customer) => {
    void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    toast.success({ title: "Phone number confirmed", description: `${customer.phone ?? "Your number"} is now on your account.` });
    onDone();
  });
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  if (state.phase === "failed") {
    return (
      <div className="grid gap-3 rounded-lg bg-surface-2 p-4">
        <FormAlert title={state.message} />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void start()}>
            Try again
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }
  if (state.phase !== "waiting") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Getting Telegram ready…
      </p>
    );
  }
  return <TelegramWait url={state.link.url} onCancel={onDone} className="bg-surface-2" />;
}
