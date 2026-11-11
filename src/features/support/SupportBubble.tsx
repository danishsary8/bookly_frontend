import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquareText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { SupportPanel } from "./SupportPanel";
import { useConversations } from "./useSupport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AssistantPanel = lazy(() => import("@/features/assistant/AssistantPanel").then((module) => ({ default: module.AssistantPanel })));

export function SupportBubble() {
  const [open, setOpen] = useState(false); const { pathname } = useLocation(); const t = useT().dict.support;
  const assistant = useT().dict.assistant; const [tab, setTab] = useState("assistant"); const [handoff, setHandoff] = useState("");
  const hidden = pathname.startsWith("/checkout") || /\/(pay|invoice|print)(\/|$)/.test(pathname) || pathname.startsWith("/account/support");
  const conversations = useConversations(false, "?unread=1", !hidden);
  const unread = conversations.data?.value.meta?.total ?? 0;
  if (hidden) return null;
  return <div className="fixed bottom-5 right-5 z-(--z-header) translate-y-[calc(var(--bottom-bar,0px)*-1)] transition-transform duration-(--dur-toggle) motion-reduce:transition-none print:hidden"><Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button aria-label={t.open} className="h-12 gap-2 rounded-full shadow-overlay"><MessageSquareText aria-hidden="true" className="size-5" /><span>{t.title}</span>{unread ? <span aria-label={`${t.unread}: ${unread}`} className="rounded-full bg-primary-foreground px-2 text-primary">{unread}</span> : null}</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] overflow-y-auto" onClickCapture={(event) => { if (event.target instanceof Element && event.target.closest("a[href]")) setOpen(false); }}><DialogTitle>{t.open}</DialogTitle><DialogDescription>{assistant.description}</DialogDescription>{open ? <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label={t.title}><TabsTrigger value="assistant">{assistant.automatic}</TabsTrigger><TabsTrigger value="human">{assistant.human}</TabsTrigger></TabsList>
      <TabsContent value="assistant"><Suspense fallback={<p role="status">{assistant.loading}</p>}><AssistantPanel onHandoff={(question) => { setHandoff(question); setTab("human"); }} /></Suspense></TabsContent>
      <TabsContent value="human"><SupportPanel initialMessage={handoff} /></TabsContent>
    </Tabs> : null}</DialogContent>
  </Dialog></div>;
}
