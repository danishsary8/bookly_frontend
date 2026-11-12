import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { newsletterApi } from "@/api/endpoints/newsletter";
import { StatusPanel } from "@/components/StatusPanel";
import { useEmailLink } from "@/features/content/useEmailLink";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/* /newsletter/unsubscribe?token=…: the unsubscribe link in every newsletter. Next steps: browse, or subscribe again. */
export default function NewsletterUnsubscribePage() {
  const { dict } = useT();
  const n = dict.newsletter;
  const l = dict.emailLink;
  const token = useSearchParams()[0].get("token") ?? "";
  useDocumentTitle(n.unsubscribeTitle, { noindex: true });
  const { state, message, retry } = useEmailLink(useCallback(() => newsletterApi.unsubscribe(token), [token]), token !== "");

  if (state === "loading") return <StatusPanel state="loading" title={n.unsubscribing} />;
  if (state === "success") {
    return (
      <StatusPanel state="success" title={n.unsubscribeTitle} primary={{ to: "/books", label: l.browse }} quiet={{ to: "/account/profile", label: l.subscribeAgain }}>
        <p>{message || n.unsubscribeSuccess}</p>
      </StatusPanel>
    );
  }
  return (
    <StatusPanel state={state} title={state === "invalid" ? l.invalidTitle : l.errorTitle} onRetry={retry} primary={{ to: "/account/profile", label: l.subscribeAgain }} quiet={{ to: "/", label: n.backToHome }}>
      <p>{state === "invalid" ? n.unsubscribeError : l.errorLead}</p>
    </StatusPanel>
  );
}
