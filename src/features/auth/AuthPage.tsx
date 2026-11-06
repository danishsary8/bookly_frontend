import type { ReactNode } from "react";
import BlurText from "@/components/BlurText";
import { AuthShell } from "@/components/AuthShell";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/*
 * Frame for every customer auth page: AuthShell (cover panel at ≥ 1024px), a paper card holding
 * an eyebrow, the page's h1 (BlurText, MASTER §5) with a plain-text accessible
 * name, a lead line, the form, and an optional footer row of links.
 */
export function AuthPage({
  eyebrow,
  title,
  lead,
  children,
  footer,
  panel,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  panel?: ReactNode;
}) {
  useDocumentTitle(title);
  return (
    <AuthShell panel={panel}>
      {/* The form sits on a card of better paper, like a bookplate; links to other pages sit under it. */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_28px_56px_-34px_rgb(60_40_10/0.45)] sm:p-8 [@media(min-width:1024px)_and_(max-height:820px)]:p-6">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2.5 text-[clamp(1.9rem,3vw,2.4rem)] leading-[1.08] text-foreground" aria-label={title}>
          <BlurText
            key={title}
            as="span"
            text={title}
            delay={60}
            animateBy="words"
            animationFrom={{ filter: "blur(8px)", opacity: 0, y: 24 }}
            animationTo={[{ filter: "blur(0px)", opacity: 1, y: 0 }]}
            stepDuration={0.3}
            easing={[0.16, 1, 0.3, 1]}
          />
        </h1>
        <div className="mt-2 text-[15px] text-muted-foreground">{lead}</div>
        <div className="mt-6 [@media(max-height:820px)]:mt-4">{children}</div>
      </div>
      {footer ? <div className="mt-4 grid gap-1 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </AuthShell>
  );
}
