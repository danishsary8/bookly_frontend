import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Clean workspace page header + padded body for every /account/* screen.
 * Desktop: crisp title bar across the top of the right pane separated by a hairline border.
 * Mobile: compact header; on the hub overview (`hideMobileHeader`) the compact tappable identity
 * row replaces the bulky header card.
 */
export function AccountSection({
  title,
  lead,
  action,
  hideMobileHeader = false,
  children,
}: {
  title: string;
  lead?: ReactNode;
  action?: ReactNode;
  avatar?: string;
  hideMobileHeader?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="account-section">
      <header className={cn("account-pane-header", hideMobileHeader && "account-pane-header-desktop-only")}>
        <div className="grid min-w-0 flex-1 gap-1">
          <h1 id={headingId} className="account-pane-title">
            {title}
          </h1>
          {lead ? <div className="account-pane-lead">{lead}</div> : null}
        </div>
        {action ? <div className="account-heading-action">{action}</div> : null}
      </header>
      <div className="account-pane-body">{children}</div>
    </section>
  );
}
