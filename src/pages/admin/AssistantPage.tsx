import { AssistantPanel } from "@/features/assistant/AssistantPanel";
import { useT } from "@/i18n";
export default function AssistantPage() { const t = useT().dict.assistant; return <div className="grid max-w-2xl gap-6"><h1 className="font-display text-3xl">{t.staffTitle}</h1><AssistantPanel staff /></div>; }
