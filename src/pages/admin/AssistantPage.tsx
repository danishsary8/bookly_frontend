import { AdminPage } from "@/features/admin/AdminPage";
import { AssistantPanel } from "@/features/assistant/AssistantPanel";
import { useT } from "@/i18n";
export default function AssistantPage() { const t = useT().dict.assistant; return <AdminPage title={t.staffTitle} lead="Find answers and keep your team moving."><div className="max-w-3xl"><AssistantPanel staff /></div></AdminPage>; }
