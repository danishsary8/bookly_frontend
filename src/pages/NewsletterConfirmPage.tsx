import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { newsletterApi } from "@/api/endpoints/newsletter";
import { StatusPanel } from "@/components/StatusPanel";
import { useEmailLink } from "@/features/content/useEmailLink";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/* /newsletter/confirm?token=…: the confirmation link in the newsletter sign-up email. Next step: new arrivals. */
export default function NewsletterConfirmPage() {
  const { dict } = useT();
  const n = dict.newsletter;
  const l = dict.emailLink;
  const token = useSearchParams()[0].get("token") ?? "";
  useDocumentTitle(n.confirmTitle, { noindex: true });
  const { state, message, retry } = useEmailLink(useCallback(() => newsletterApi.confirm(token), [token]), token !== "");

  if (state === "loading") return <StatusPanel state="loading" title={n.confirming} />;
  if (state === "success") {
    return (
      <StatusPanel state="success" title={n.confirmTitle} primary={{ to: "/books?sort=newest", label: l.newArrivals }} quiet={{ to: "/", label: n.backToHome }}>
        <p>{message || n.confirmSuccess}</p>
      </StatusPanel>
    );
  }
  return (
    <StatusPanel state={state} title={state === "invalid" ? l.invalidTitle : l.errorTitle} onRetry={retry} primary={{ to: "/", label: n.backToHome }} quiet={{ to: "/books", label: l.browse }}>
      <p>{state === "invalid" ? `${n.confirmError} ${l.newsletterInvalid}` : l.errorLead}</p>
    </StatusPanel>
  );
}
