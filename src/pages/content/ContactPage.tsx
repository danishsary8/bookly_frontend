import type { ComponentType } from "react";
import { ArrowUpRight, Clock3, HelpCircle, Mail, Package, Phone, RotateCcw, Send, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { contact } from "@/content/shop";
import { Bookplate } from "@/features/content/Bookplate";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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
 * /contact: direct ways to reach the shop (no form: links that open Telegram,
 * the phone or email), opening hours, and the answers people usually write in for.
 * The details come from src/content/shop.ts.
 */
export default function ContactPage() {
  const { dict } = useT();
  const c = dict.content;
  useDocumentTitle(c.contactUs);
  return (
    <div className="container-shell pb-20 pt-6 sm:pt-8">
      <Breadcrumb items={[{ label: c.home, to: "/" }, { label: c.contactUs }]} />
      <Bookplate
        className="mt-4"
        eyebrow={c.help}
        title={c.contactUs}
        lead={<Rich text={c.contactLead} strong="font-semibold text-on-lapis" />}
      />

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="channels" className="lg:col-span-7">
          <h2 id="channels" className="font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
            {c.talk}
          </h2>
          <ul className="mt-6 grid border-t border-border">
            {channels.map(({ Icon, label, value, href, detail, external }) => (
              <li key={label} className="border-b border-border">
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="group grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-4 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-lapis-tint text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{c[label]}</span>
                    <span className="text-[1.25rem] font-semibold [overflow-wrap:anywhere] tabular-nums text-foreground underline-offset-4 group-hover:text-primary group-hover:underline">
                      {value}
                    </span>
                    <span className="text-[15px] text-muted-foreground">{c[detail]}</span>
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  {external ? <span className="sr-only">{c.opensTelegram}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="visit" className="grid content-start gap-6 lg:col-span-4 lg:col-start-9">
          <section className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="visit" className="font-display text-[1.563rem] leading-tight">
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
            <div className="grid gap-1 border-t border-border pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="size-4 text-primary" aria-hidden="true" /> {c.onlineOnly}
              </p>
              <p className="text-muted-foreground">
                <Rich text={c.noShop} />
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{c.phnomPenhTime}</p>
          </section>
        </aside>
      </div>

      <section aria-labelledby="self-serve" className="mt-16">
        <h2 id="self-serve" className="font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
          {c.selfServe}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {selfServe.map(({ Icon, title, text, to }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex h-full items-start gap-4 rounded-xl border border-border bg-card p-5 outline-none transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="grid gap-1">
                  <span className="font-semibold group-hover:text-primary">{c[title]}</span>
                  <span className="text-[15px] text-muted-foreground">{c[text]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
