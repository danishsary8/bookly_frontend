import type { ReactNode } from "react";

/** Heading block for one account page (the page's h1) with an optional action on the right. */
export function AccountSection({ title, lead, action, children }: { title: string; lead?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby="account-section-title" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 id="account-section-title" className="font-display text-[2.441rem] leading-[1.1]">
            {title}
          </h1>
          {lead ? <div className="text-muted-foreground">{lead}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
