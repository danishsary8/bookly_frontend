import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { CoverWall } from "@/features/auth/CoverWall";
import { AgreeNote } from "@/features/auth/AgreeNote";
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
    <Link to="/" className="group inline-flex min-h-11 items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-80" aria-label={dict.signin.home}>
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
  /** Show the terms/privacy line: on the blue panel at ≥1024px, under the card on smaller screens. */
  legal?: boolean;
}

/** Desktop (lg, 1024px+) shows the lapis panel beside the form; smaller screens show it under the form. */
const DESKTOP = "(min-width: 1024px)";
const subscribe = (notify: () => void) => {
  const mq = window.matchMedia?.(DESKTOP);
  mq?.addEventListener("change", notify);
  return () => mq?.removeEventListener("change", notify);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia?.(DESKTOP).matches ?? true, () => true);

export const AuthShell = ({ children, panel, legal = false }: AuthShellProps) => {
  const { dict } = useT();
  // Only one copy of the panel is mounted, so its cover carousel never runs twice.
  const desktop = useDesktop();
  return (
    <div className="auth-paper min-h-dvh bg-background text-foreground lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto grid min-h-dvh max-w-[1360px] lg:h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10 lg:p-4">
        {desktop ? (
          <aside className="hero-lapis auth-cover hidden min-h-0 flex-col justify-between gap-6 overflow-hidden rounded-[14px] p-9 lg:flex xl:p-11">
            <Wordmark onLapis />
            {panel ?? <CoverWall />}
            {legal ? <div className="border-t border-on-lapis-muted/20 pt-4"><AgreeNote onLapis /></div> : null}
          </aside>
        ) : null}

        <main id="content" tabIndex={-1} className="relative flex min-h-0 flex-col px-4 py-5 sm:px-6 lg:overflow-y-auto lg:px-2 lg:py-0">
          {/* Mobile: wordmark + back. Desktop: the back button sits in the card header (AuthPage). */}
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <span className="lg:hidden"><Wordmark /></span>
            <Link
              to="/"
              aria-label={dict.content.backToStore}
              title={dict.content.backToStore}
              className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.08)] transition-[background-color,transform] duration-150 hover:bg-muted active:scale-95"
            >
              <ArrowLeft className="size-[18px]" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-1 items-start justify-center py-6 md:items-center md:pb-16 lg:items-stretch lg:py-0">
            <div className="w-full max-w-[34rem] lg:flex lg:max-w-[36rem] lg:flex-col">
              {children}
              {/* Phones and tablets: the same lapis panel under the form, seen once you scroll (owner 2026-11-18). The
                  wordmark is already in the top bar, so the panel starts with the shelves; the legal note sits inside. */}
              {desktop ? null : (
                <aside className="hero-lapis auth-cover mt-6 flex h-[30rem] flex-col justify-between gap-5 overflow-hidden rounded-[14px] px-9 pb-7 pt-4 sm:h-[34rem]">
                  {panel ?? <CoverWall />}
                  {legal ? <div className="border-t border-on-lapis-muted/20 pt-4"><AgreeNote onLapis /></div> : null}
                </aside>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
