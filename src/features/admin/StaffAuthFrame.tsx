import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/*
 * Frame for staff sign-in, 2FA and password reset (pages/admin.md): a quiet,
 * centred card on the page canvas, the wordmark with a "Staff" label, and a
 * one-line security note. No storefront header, footer or imagery.
 */
export function StaffAuthFrame({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useDocumentTitle(`${title} · Staff`);
  return (
    <main id="content" tabIndex={-1} className="grid min-h-dvh place-items-center bg-background px-4 py-10 outline-none">
      <div className="grid w-full max-w-[26rem] gap-6">
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="font-display text-[1.75rem] leading-none text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Bookly
          </Link>
          <span className="rounded-[4px] border border-border px-2 py-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Staff</span>
        </div>
        <section aria-labelledby="staff-auth-title" className="grid gap-6 rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="grid gap-2">
            <h1 id="staff-auth-title" className="font-display text-[2rem] leading-[1.1]">
              {title}
            </h1>
            {lead ? <div className="text-[15px] leading-6 text-muted-foreground">{lead}</div> : null}
          </div>
          {children}
        </section>
        {footer ? <div className="grid justify-items-center gap-1 text-sm">{footer}</div> : null}
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" /> Staff accounts are protected by two-step verification.
        </p>
      </div>
    </main>
  );
}
