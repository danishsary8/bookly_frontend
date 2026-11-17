import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { markHasAccount, SEEN } from "./newHere";

const SHOW_MS = 8000;

/*
 * Sign-in page: "New to Bookly? Create an account" (owner 2026-11-17: friends missed sign up). A slim note inside the
 * card, above the heading, so it never covers the header on phones. Fades out after 8 s, on ✕, or once the visitor
 * starts typing (they are signing in). Not shown again after a dismissal or a sign-in on this browser.
 */
export function NewHereNotice({ to, hide = false }: { to: string; hide?: boolean }) {
  const t = useT().dict.signin;
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SEEN) !== "1";
    } catch {
      return true;
    }
  });
  const close = () => {
    setOpen(false);
    markHasAccount();
  };
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <AnimatePresence initial={!reduce}>
      {open && !hide ? (
        <m.div
          role="status"
          initial={reduce ? false : { opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
          transition={{ duration: reduce ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-lapis-tint px-3.5 py-2 text-sm">
            <Sparkles className="hidden size-4 shrink-0 text-primary sm:block" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-foreground">
              {t.newHere}{" "}
              <Link to={to} className="whitespace-nowrap font-semibold text-primary underline underline-offset-4 hover:no-underline">
                {t.newHereLink}
              </Link>
            </p>
            <button
              type="button"
              onClick={close}
              aria-label={t.newHereClose}
              className="-my-1 -mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
