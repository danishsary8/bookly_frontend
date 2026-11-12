import type { ComponentType } from "react";
import { ArrowUpRight, Clock3, HelpCircle, Mail, Package, Phone, RotateCcw, Send, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { contact } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { useT } from "@/i18n";
import { Rich } from "@/i18n/Rich";

type Channel = {
  Icon: ComponentType<{ className?: string }>;
  label: "telegram" | "phone" | "email";
  value: string;
  href: string;
  detail: "telegramDetail" | "phoneDetail" | "emailDetail";
  external?: boolean;
};

const channels: Channel[] = [
  { Icon: Send, label: "telegram", value: contact.telegram, href: contact.telegramHref, detail: "telegramDetail", external: true },
  { Icon: Phone, label: "phone", value: contact.phone, href: contact.phoneHref, detail: "phoneDetail" },
  { Icon: Mail, label: "email", value: contact.email, href: `mailto:${contact.email}`, detail: "emailDetail" },
];

const selfServe = [
  { Icon: Package, title: "whereOrder", text: "whereOrderText", to: "/account/orders" },
  { Icon: RotateCcw, title: "returning", text: "returningText", to: "/returns-policy" },
  { Icon: HelpCircle, title: "faq", text: "faqText", to: "/faq" },
] as const;

/*
 * /contact (pages/content.md): the shared info layout with the direct ways to reach the shop as cards (no form:
 * links that open Telegram, the phone or email), opening hours, and the answers people usually write in for.
 * The details come from src/content/shop.ts.
 */
export default function ContactPage() {
  const { dict } = useT();
  const c = dict.content;
  const t = dict.infoPages;
  const card = "shop-card rounded-2xl border border-border bg-card";
  return (
    <ContentPage
      title={c.contactUs}
      eyebrow={c.help}
      lead={<Rich text={c.contactLead} strong="font-semibold text-foreground" />}
      related={[
        { to: "/faq", label: t.pages.faq },
        { to: "/shipping", label: t.pages.shipping },
      ]}
    >
      <section aria-labelledby="channels" className="grid gap-5">
        <h2 id="channels" className="font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
          {c.talk}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {channels.map(({ Icon, label, value, href, detail, external }) => (
            <li key={label}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                className={`${card} group grid h-full content-start gap-2 p-4 outline-none transition-[border-color,translate] duration-150 hover:-translate-y-0.5 hover:border-input focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0`}
              >
                <span className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-lapis-tint text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{c[label]}</span>
                <span className="font-semibold [overflow-wrap:anywhere] tabular-nums text-foreground underline-offset-4 group-hover:text-primary group-hover:underline">{value}</span>
                <span className="text-sm text-muted-foreground">{c[detail]}</span>
                {external ? <span className="sr-only">{c.opensTelegram}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hours" className="grid gap-4 rounded-xl border border-border bg-surface-1 p-5 sm:grid-cols-2 sm:gap-8">
        <div className="grid content-start gap-3">
          <h2 id="hours" className="font-display text-[1.563rem] leading-tight">
            {c.hours}
          </h2>
          <dl className="grid gap-2 text-[15px]">
            {contact.hours.map((h) => (
              <div key={h.days} className="flex items-baseline justify-between gap-4">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {c.days[h.days] ?? h.days}
                </dt>
                <dd className="font-semibold tabular-nums">{h.time === "Closed" ? c.closed : c.timeRange(h.time)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">{c.phnomPenhTime}</p>
        </div>
        <div className="grid content-start gap-1 sm:border-l sm:border-border sm:pl-8">
          <p className="flex items-center gap-2 font-semibold">
            <Truck className="size-4 text-primary" aria-hidden="true" /> {c.onlineOnly}
          </p>
          <p className="text-muted-foreground">
            <Rich text={c.noShop} />
          </p>
        </div>
      </section>

      <section aria-labelledby="self-serve" className="grid gap-4">
        <h2 id="self-serve" className="font-display text-[1.563rem] leading-tight">
          {c.selfServe}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {selfServe.map(({ Icon, title, text, to }) => (
            <li key={to}>
              <Link to={to} className="group flex h-full items-start gap-3 rounded-xl border border-border p-4 outline-none transition-colors duration-150 hover:border-input hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-ring">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="grid gap-1">
                  <span className="font-semibold group-hover:text-primary">{c[title]}</span>
                  <span className="text-sm text-muted-foreground">{c[text]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ContentPage>
  );
}
