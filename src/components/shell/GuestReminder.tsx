import { useEffect, useState } from "react";
import { UserRound, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/api/session";
import { useT } from "@/i18n";

/*
 * A gentle reminder for guests on phones and tablets (hidden from lg up): sign in or create an account to track
 * orders and keep a wishlist. Shows after a few seconds, never on sign-in, sign-up, checkout or account pages,
 * and once dismissed stays away for 7 days (this device only).
 */
const KEY = "bookly.guest-reminder.dismissed-at";
const QUIET_DAYS = 7;
const HIDDEN_ON = ["/login", "/register", "/sign-up", "/verify-email", "/verify-otp", "/forgot-password", "/reset-password", "/checkout", "/account", "/admin", "/read"];

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < QUIET_DAYS * 86_400_000;
  } catch {
    return false;
  }
};

export function GuestReminder() {
  const signedIn = Boolean(useSession("customer"));
  const { pathname, search } = useLocation();
  const { dict } = useT();
  const t = dict.shell;
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(recentlyDismissed);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 4000);
    return () => window.clearTimeout(id);
  }, []);

  if (signedIn || dismissed || !ready || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* private mode: hidden until the page reloads */
    }
  };
  const next = encodeURIComponent(pathname + search);

  return (
    <aside
      aria-label={t.guestTitle}
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-(--z-popover) rounded-2xl border border-border bg-card p-4 shadow-lift lg:hidden"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.guestDismiss}
        className="absolute right-1.5 top-1.5 grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{t.guestTitle}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.guestLead}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to={`/register?next=${next}`} onClick={dismiss} className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {t.guestCreate}
        </Link>
        <Link to={`/login?next=${next}`} onClick={dismiss} className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {t.guestSignIn}
        </Link>
      </div>
    </aside>
  );
}
