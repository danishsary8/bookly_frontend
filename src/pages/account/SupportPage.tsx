import { SupportPanel } from "@/features/support/SupportPanel";
import { useT } from "@/i18n";
import { AccountSection } from "@/features/account/AccountSection";

/* Support in the account: the panel's intro ("a person from Bookly will reply here …") becomes the page lead. */
export default function SupportPage() {
  const { dict } = useT();
  return (
    <AccountSection title={dict.support.title} lead={dict.support.intro}>
      <div className="account-support-panel">
        <SupportPanel />
      </div>
    </AccountSection>
  );
}
