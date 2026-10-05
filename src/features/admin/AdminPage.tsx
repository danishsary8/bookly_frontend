import type { ReactNode } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Top of an admin screen: the page's h1, an optional one-line description, and actions on the right. */
export function AdminPage({ title, lead, actions, back, children }: { title: string; lead?: ReactNode; actions?: ReactNode; back?: ReactNode; children: ReactNode }) {
  useDocumentTitle(`${title} · Staff`);
  return (
    <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-3">
        {back}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h1 className="font-display text-[clamp(1.9rem,3vw,2.4rem)] leading-[1.1]">{title}</h1>
            {lead ? <div className="text-[15px] text-muted-foreground">{lead}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
