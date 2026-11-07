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
  legal,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  panel?: ReactNode;
  legal?: boolean;
}) {
  useDocumentTitle(title);
  return (
    <AuthShell panel={panel} legal={legal}>
      {/* The form sits on a card of better paper, like a bookplate; links to other pages sit under it. */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(20_32_122/0.06),0_30px_60px_-36px_rgb(20_32_122/0.35)] sm:px-10 sm:py-7 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-14 lg:py-10 [@media(min-width:1024px)_and_(max-height:820px)]:py-6">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2.5 text-[clamp(1.75rem,2.6vw,2.2rem)] leading-[1.08] text-foreground" aria-label={title}>
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
        <div className="mt-5 [@media(max-height:820px)]:mt-4">{children}</div>
      </div>
      {footer ? <div className="mt-3 grid gap-1 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </AuthShell>
  );
}
