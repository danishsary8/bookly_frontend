import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/**
 * "Finish securing your account" (owner 2026-11-17): what is still missing among a confirmed email, a password and a
 * confirmed phone, each linking to the place on Sign-in & security that fixes it. Hidden once all three are done.
 * `compact` drops the links (used on the security page itself, where the rows below are the fix).
 */
export function SecurityChecklist({ compact = false }: { compact?: boolean }) {
  const { dict } = useT();
  const t = dict.securityChecklist;
  const session = useSession<Customer>("customer");
  const me = useQuery(accountQueries.me());
  const c = me.data ?? session?.user;
  if (!c) return null;
  const items = [
    { key: "email", done: Boolean(c.email_verified), label: c.email_verified ? t.emailDone : t.email, hint: t.emailHint, to: "/account/security#sign-in-methods" },
    { key: "password", done: c.has_password !== false, label: c.has_password !== false ? t.passwordDone : t.password, hint: t.passwordHint, to: "/account/security#password" },
    { key: "phone", done: Boolean(c.phone_verified), label: c.phone_verified ? t.phoneDone : t.phone, hint: t.phoneHint, to: "/account/security#sign-in-methods" },
  ];
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <section aria-labelledby="security-checklist" className="grid gap-3 rounded-2xl border border-warning/30 bg-warning-tint/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="security-checklist" className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
          <ShieldAlert className="size-5 text-warning" aria-hidden="true" />
          {t.title}
        </h2>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">{t.done(done, items.length)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-card" aria-hidden="true">
        <span className="block h-full rounded-full bg-warning transition-[width] duration-500" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="grid gap-1">
        {items.map((i) => {
          const body = (
            <>
              {i.done ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" /> : <Circle className="size-5 shrink-0 text-warning" aria-hidden="true" />}
              <span className="grid min-w-0 flex-1">
                <span className={cn("text-[15px] font-semibold", i.done && "text-muted-foreground")}>{i.label}</span>
                {!i.done ? <span className="text-sm text-muted-foreground">{i.hint}</span> : null}
              </span>
              {!i.done && !compact ? <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
            </>
          );
          return (
            <li key={i.key}>
              {i.done || compact ? (
                <div className="flex min-h-11 items-center gap-3 px-1 py-1.5">{body}</div>
              ) : (
                <Link to={i.to} className="flex min-h-11 items-center gap-3 rounded-xl px-1 py-1.5 outline-none transition-colors hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring">{body}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
