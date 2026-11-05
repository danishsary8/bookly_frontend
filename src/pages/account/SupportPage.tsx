import { SupportPanel } from "@/features/support/SupportPanel";
import { useT } from "@/i18n";
export default function SupportPage() { return <div className="grid gap-6"><h1 className="font-display text-3xl">{useT().dict.support.title}</h1><SupportPanel /></div>; }
