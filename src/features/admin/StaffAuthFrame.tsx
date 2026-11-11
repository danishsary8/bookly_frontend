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
        <section aria-labelledby="staff-auth-title" className="desk-card grid overflow-hidden rounded-xl border border-border bg-card">
          {/* A lapis band with the wordmark: the same "library card" header as the customer account (pages/admin.md). */}
          <div className="relative flex items-center gap-3 overflow-hidden bg-lapis px-6 py-5 sm:px-8">
            <span className="pointer-events-none absolute -right-8 -top-12 size-32 rounded-full bg-[radial-gradient(closest-side,rgb(154_166_255/0.4),transparent)]" aria-hidden="true" />
            <Link to="/" className="relative font-display text-[1.75rem] leading-none text-on-lapis outline-none focus-visible:ring-2 focus-visible:ring-gold">
              Bookly
            </Link>
            <span className="relative rounded-[4px] border border-gold/60 px-2 py-1 text-xs font-bold uppercase tracking-[0.18em] text-gold">Staff</span>
          </div>
          <div className="grid gap-6 p-6 sm:p-8">
          <div className="grid gap-2">
            <h1 id="staff-auth-title" className="font-display text-[2rem] leading-[1.1]">
              {title}
            </h1>
            {lead ? <div className="text-[15px] leading-6 text-muted-foreground">{lead}</div> : null}
          </div>
          {children}
          </div>
        </section>
        {footer ? <div className="grid justify-items-center gap-1 text-sm">{footer}</div> : null}
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" /> Staff accounts are protected by two-step verification.
        </p>
      </div>
    </main>
  );
}
