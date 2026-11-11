import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Book detail cover stage (pages/book.md): the cover's own colours, hugely blurred, bleed into the panel like ink on
 * paper; a straight cover has a subtle spine hinge, page edge and contact shadow. The cover and its action share one
 * column so the action is always exactly as wide as the cover.
 */
export function BookStage({ cover, children, className, action }: { cover?: string | null; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn("detail-book-stage relative isolate", className)}>
      {cover ? (
        <img src={cover} alt="" aria-hidden="true" className="detail-book-aura pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-20 blur-3xl saturate-150" />
      ) : null}

      <div className="detail-cover-column">
        <div className="detail-book-object relative">
          <span className="detail-book-back" aria-hidden="true" />
          {children}
          <span className="detail-book-shadow" aria-hidden="true" />
        </div>
        {action ? <div className="detail-cover-action">{action}</div> : null}
      </div>
    </div>
  );
}
