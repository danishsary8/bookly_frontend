import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { CoverWall } from "@/features/auth/CoverWall";
import { brand } from "@/config/brand";
import { useT } from "@/i18n";

/*
 * Shared frame for Sign in / Create account / Forgot password / Reset password ("paper & cloth", matches the splash).
 * Warm paper page (.auth-paper tokens in index.css); at ≥1024px a lapis cloth "book cover" panel with a gold-ruled
 * frame sits beside the form, showing a slow wall of the shop's covers (CoverWall) unless a page passes its own panel. The panel is decorative context, so the page's <h1> always lives in the form column.
 * At ≥1024px the page fits the screen height; only the form column scrolls if a step is ever taller.
 */

const Wordmark = ({ onLapis = false }: { onLapis?: boolean }) => {
  const { dict } = useT();
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-80" aria-label={dict.signin.home}>
      <span className={`grid h-9 w-9 place-items-center rounded-md ${onLapis ? "border border-gold/60 text-gold" : "bg-primary text-primary-foreground"}`}>
        <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className={`font-display text-xl leading-tight ${onLapis ? "text-on-lapis" : "text-primary"}`}>{brand.name}</span>
    </Link>
  );
};

interface AuthShellProps {
  children: ReactNode;
  /** Replaces the quotes on the lapis panel (sign-up and verify show the library card). */
  panel?: ReactNode;
}

export const AuthShell = ({ children, panel }: AuthShellProps) => {
  const { dict } = useT();
  return (
    <div className="auth-paper min-h-dvh bg-background text-foreground lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto grid min-h-dvh max-w-[1360px] lg:h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10 lg:p-4">
        <aside className="hero-lapis auth-cover hidden min-h-0 flex-col justify-between gap-6 overflow-hidden rounded-[14px] p-9 lg:flex xl:p-11">
          <Wordmark onLapis />
          {panel ?? <CoverWall />}
        </aside>

        <main id="content" tabIndex={-1} className="flex min-h-0 flex-col px-4 py-5 sm:px-6 lg:overflow-y-auto lg:px-2 lg:py-4">
          <div className="flex items-center justify-between gap-4 lg:justify-end">
            <span className="lg:hidden"><Wordmark /></span>
            <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {dict.content.backToStore}
            </Link>
          </div>
          <div className="flex flex-1 items-start justify-center py-6 lg:py-2 lg:pt-[4vh]">
            <div className="w-full max-w-[28rem]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};
