import type { ReactNode } from "react";
import BlurText from "@/components/BlurText";
import { AuthShell } from "@/components/AuthShell";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/*
 * Frame for every customer auth page: AuthShell (lapis quote panel at ≥ 1024px),
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
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground" aria-label={title}>
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
      <div className="mt-3 text-base text-muted-foreground">{lead}</div>
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-8 grid gap-2 border-t border-border pt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </AuthShell>
  );
}
