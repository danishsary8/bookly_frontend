import { m, useReducedMotion } from "motion/react";
import { Mail, Send } from "lucide-react";
import type { VerifyChannel } from "@/api/endpoints/auth";
import { cn } from "@/lib/utils";

/*
 * The sign-up signature (docs/AUTH_PLAN.md): a Bookly library card on the lapis panel, filled in as the
 * customer signs up. It writes their name as they type it, says where the code went, and gets a gold
 * "Member" stamp pressed onto it when the code is right. Decorative: the form says everything too, so
 * the card is hidden from assistive tech.
 */

export interface CardDetails {
  name?: string | null;
  channel?: VerifyChannel | null;
  /** The email address or phone number the code went to (or will go to). */
  destination?: string | null;
  /** "Code sent to" once sent; "Code goes to" while signing up. */
  sent?: boolean;
  /** The account number once there is one. */
  cardNumber?: number | null;
  stamped?: boolean;
}

const CHANNEL = { email: { label: "Email", Icon: Mail }, telegram: { label: "Telegram", Icon: Send } } as const;

const cardNo = (id?: number | null) => (id ? String(id).padStart(6, "0") : "——————");

function Stamp({ visible }: { visible: boolean }) {
  const reduceMotion = useReducedMotion();
  if (!visible) return null;
  return (
    <m.div
      className="library-stamp absolute right-5 top-14 grid size-28 place-items-center rounded-full text-gold"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: -4 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: [1.6, 0.96, 1.08, 1], rotate: -12 }}
      transition={reduceMotion ? { duration: 0.15 } : { duration: 0.42, times: [0, 0.55, 0.8, 1], ease: [0.2, 0.9, 0.3, 1] }}
    >
      <span className="grid place-items-center text-center leading-none">
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.3em]">Bookly</span>
        <span className="mt-1 font-display text-[1.45rem]">Member</span>
        <span className="mt-1 text-[0.55rem] font-semibold uppercase tracking-[0.3em]">{new Date().getFullYear()}</span>
      </span>
    </m.div>
  );
}

export function LibraryCard({ name, channel, destination, sent = false, cardNumber, stamped = false }: CardDetails) {
  const via = channel ? CHANNEL[channel] : null;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md select-none">
      <div className="bookplate-frame library-card relative px-7 pb-9 pt-7">
        {(["left-0 top-0", "right-0 top-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((corner) => (
          <span key={corner} className={cn("bookplate-corner", corner)} />
        ))}
        <p className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-gold">
          <span>Ex libris · Bookly</span>
          <span className="tabular-nums tracking-[0.18em] text-on-lapis-muted">No. {cardNo(cardNumber)}</span>
        </p>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-on-lapis-muted">Reader</p>
        <p className={cn("mt-1 min-h-[2.6rem] truncate font-display text-[2.1rem] leading-tight", name ? "text-on-lapis" : "text-on-lapis-muted/50", stamped && "pr-28")}>
          {name?.trim() || "Your name"}
        </p>
        <dl className="mt-6 divide-y divide-gold/25 border-y border-gold/25 text-[15px]">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-on-lapis-muted">{sent ? "Code sent to" : "Code goes to"}</dt>
            <dd className="flex min-w-0 items-center gap-2 text-on-lapis">
              {via ? <via.Icon className="size-4 shrink-0 text-gold" /> : null}
              <span className="truncate">{via ? via.label : "—"}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-on-lapis-muted">{channel === "telegram" ? "Number" : "Address"}</dt>
            <dd className="min-w-0 truncate text-on-lapis tabular-nums">{destination?.trim() || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-on-lapis-muted">Status</dt>
            <dd className={stamped ? "font-semibold text-gold" : "text-on-lapis"}>{stamped ? "Member" : sent ? "Waiting for your code" : "Signing up"}</dd>
          </div>
        </dl>
        <Stamp visible={stamped} />
      </div>
      <p className="mt-6 max-w-sm text-[15px] leading-6 text-on-lapis-muted">
        {stamped ? "Welcome to the library. Your card is ready." : "Every reader gets a card. Yours is stamped when you enter your code."}
      </p>
    </div>
  );
}

/** Phones hide the lapis panel, so the card shrinks to a strip above the code boxes. */
export function LibraryStrip({ name, channel, destination, stamped = false }: CardDetails) {
  const via = channel ? CHANNEL[channel] : null;
  return (
    <div aria-hidden="true" className="hero-lapis flex items-center gap-3 rounded-lg px-4 py-3 lg:hidden">
      {via ? <via.Icon className="size-5 shrink-0 text-gold" /> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg leading-tight text-on-lapis">{name?.trim() || "Bookly reader"}</p>
        <p className="truncate text-sm text-on-lapis-muted">
          {via ? `${via.label} · ` : ""}
          {destination || "—"}
        </p>
      </div>
      {stamped ? <span className="rounded-full border border-gold px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Member</span> : null}
    </div>
  );
}
