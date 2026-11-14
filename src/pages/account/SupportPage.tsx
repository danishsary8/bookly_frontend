import { SupportPanel } from "@/features/support/SupportPanel";
import { useT } from "@/i18n";
import { AccountSection } from "@/features/account/AccountSection";
export default function SupportPage() {
  const { dict } = useT();
  return <AccountSection title={dict.support.title}><div className="account-support-panel"><SupportPanel /></div></AccountSection>;
}
