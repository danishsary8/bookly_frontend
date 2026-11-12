import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { StatusPanel } from "@/components/StatusPanel";
import { useEmailLink } from "@/features/content/useEmailLink";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/**
 * The "Stop cart reminder emails" link in a cart reminder: /email/cart-reminders/stop?customer=…&token=…
 * Works without signing in (the token is the proof); turning them back on is in Account → Profile.
 * Next steps: the cart that was waiting, or the shop.
 */
export default function CartReminderStopPage() {
  const { dict } = useT();
  const t = dict.cartReminder;
  const l = dict.emailLink;
  const [params] = useSearchParams();
  const customer = Number(params.get("customer"));
  const token = params.get("token") ?? "";
  const valid = Number.isInteger(customer) && customer > 0 && token !== "";
  useDocumentTitle(t.stopTitle, { noindex: true });
  const { state, retry } = useEmailLink(useCallback(() => accountApi.stopCartReminders(customer, token), [customer, token]), valid);

  if (state === "loading") return <StatusPanel state="loading" title={t.stopping} />;
  if (state === "success") {
    return (
      <StatusPanel state="success" title={t.stopTitle} primary={{ to: "/cart", label: l.viewCart }} quiet={{ to: "/books", label: l.browse }}>
        <p>{t.stopDone}</p>
      </StatusPanel>
    );
  }
  return (
    <StatusPanel state={state} title={state === "invalid" ? l.invalidTitle : l.errorTitle} onRetry={retry} primary={{ to: "/account/profile", label: t.turnBackOn }} quiet={{ to: "/", label: t.backHome }}>
      <p>{state === "invalid" ? t.stopInvalid : l.errorLead}</p>
    </StatusPanel>
  );
}
