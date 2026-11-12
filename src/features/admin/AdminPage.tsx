import { m, useReducedMotion } from "motion/react";
import { transitions } from "@/lib/motion";
import { groupFor } from "./adminNav";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { RefreshNote } from "./RefreshNote";

/** Top of an admin screen: the page's h1, an optional one-line description, and actions on the right. */
export function AdminPage({ title, lead, actions, back, children }: { title: string; lead?: ReactNode; actions?: ReactNode; back?: ReactNode; children: ReactNode }) {
  useDocumentTitle(`${title} · Staff`);
  const reducedMotion = useReducedMotion();
  const { pathname } = useLocation();
  const group = groupFor(pathname);
  return (
    <m.div className="admin-page mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transitions.page}>
      <div className="admin-page-header grid gap-3" data-tone={group?.tone ?? "blue"}>
        <p className="admin-eyebrow inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{group?.label ?? "Workspace"}</p>
        {back}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid min-w-0 gap-2">
            <h1 className="font-display text-[clamp(1.85rem,2.6vw,2.3rem)] leading-[1.1]">{title}</h1>
            {lead ? <div className="text-[15px] text-muted-foreground">{lead}</div> : null}
            <RefreshNote />
          </div>
          {actions ? <div className="admin-page-actions flex max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      {children}
    </m.div>
  );
}
