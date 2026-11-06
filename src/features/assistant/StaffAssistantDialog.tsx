import { MessageSquareText } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

const AssistantPanel = lazy(() => import("./AssistantPanel").then((module) => ({ default: module.AssistantPanel })));

export function StaffAssistantDialog() {
  const t = useT().dict.assistant;
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={t.staffTitle}><MessageSquareText aria-hidden="true" /></Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] overflow-y-auto" onClickCapture={(event) => { if (event.target instanceof Element && event.target.closest("a[href]")) setOpen(false); }}><DialogTitle>{t.staffTitle}</DialogTitle><DialogDescription>{t.staffDescription}</DialogDescription><Suspense fallback={<p role="status">{t.loading}</p>}><AssistantPanel staff /></Suspense></DialogContent>
  </Dialog>;
}
