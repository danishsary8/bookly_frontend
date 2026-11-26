import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, MessageSquareText, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { SupportPanel } from "./SupportPanel";
import { useConversations } from "./useSupport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AssistantPanel = lazy(() => import("@/features/assistant/AssistantPanel").then((module) => ({ default: module.AssistantPanel })));

export function SupportBubble() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const t = useT().dict.support;
  const assistant = useT().dict.assistant;
  const [tab, setTab] = useState("assistant");
  const [handoff, setHandoff] = useState("");
  const hidden = pathname.startsWith("/checkout") || pathname.startsWith("/account") || /\/(pay|invoice|print)(\/|$)/.test(pathname);
  const conversations = useConversations(false, "?unread=1", !hidden);
  const unread = conversations.data?.value.meta?.total ?? 0;
  if (hidden) return null;
  return (
    <div className="fixed bottom-5 right-5 z-(--z-header) translate-y-[calc(var(--bottom-bar,0px)*-1)] transition-transform duration-(--dur-toggle) motion-reduce:transition-none print:hidden lg:bottom-6 lg:right-6">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {/* A round button the size of the corner widget on the left: small enough not to sit on page content. */}
          <Button
            aria-label={t.open}
            title={t.title}
            className="relative size-14 rounded-full p-0 shadow-[0_14px_30px_-10px_rgb(20_32_122/0.65)] ring-1 ring-white/15 transition-transform hover:-translate-y-0.5"
          >
            <MessageSquareText aria-hidden="true" className="size-6" />
            {unread ? (
              <span
                aria-label={`${t.unread}: ${unread}`}
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-foreground ring-2 ring-background"
              >
                {unread}
              </span>
            ) : null}
          </Button>
        </DialogTrigger>
        <DialogContent
          containerClassName="items-end pb-3 px-2.5 sm:items-end sm:justify-items-end sm:pb-[5.5rem] sm:pr-5 sm:pl-4 lg:pb-24 lg:pr-6"
          className="flex h-[min(85dvh,640px)] max-h-[85dvh] w-[min(95vw,430px)] flex-col overflow-hidden rounded-2xl border-border/80 p-0 shadow-overlay [&>[aria-label]]:text-primary-foreground [&>[aria-label]]:hover:bg-white/15 [&>[aria-label]]:hover:text-white"
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("a[href]")) setOpen(false);
          }}
        >
          <div className="hero-lapis shrink-0 rounded-none border-b border-white/10 px-5 pt-4 pb-3.5 pr-12 text-primary-foreground">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/12 text-gold ring-1 ring-white/15" aria-hidden="true">
                <Bot className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg leading-tight text-white">{t.open}</DialogTitle>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                    <Sparkles className="size-2.5" aria-hidden="true" /> AI & Team
                  </span>
                </div>
                <DialogDescription className="mt-0.5 line-clamp-1 text-xs leading-snug text-white/80">
                  {assistant.description}
                </DialogDescription>
              </div>
            </div>
          </div>
          {open ? (
            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border bg-surface-2/50 px-4 pt-1">
                <TabsList aria-label={t.title} className="w-full justify-start gap-6 border-b-0">
                  <TabsTrigger value="assistant" className="py-2.5 text-xs font-semibold sm:text-sm">
                    {assistant.automatic}
                  </TabsTrigger>
                  <TabsTrigger value="human" className="py-2.5 text-xs font-semibold sm:text-sm">
                    <span>{assistant.human}</span>
                    {unread ? (
                      <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.2 text-[11px] font-bold text-accent-foreground">
                        {unread}
                      </span>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="assistant" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                <Suspense fallback={<p role="status" className="p-4 text-sm text-muted-foreground">{assistant.loading}</p>}>
                  <AssistantPanel
                    onHandoff={(question) => {
                      setHandoff(question);
                      setTab("human");
                    }}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value="human" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                <SupportPanel initialMessage={handoff} />
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
