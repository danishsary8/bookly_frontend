import type { ComponentType } from "react";
import { ArrowUpRight, Clock3, HelpCircle, Mail, MapPin, Package, Phone, RotateCcw, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { contact } from "@/content/shop";
import { Bookplate } from "@/features/content/Bookplate";
import { ToConfirm } from "@/features/content/ToConfirm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type Channel = { Icon: ComponentType<{ className?: string }>; label: string; value: string; href: string; detail: string; external?: boolean };

const channels: Channel[] = [
  { Icon: Send, label: "Telegram", value: contact.telegram, href: contact.telegramHref, detail: "Quickest for questions about an order.", external: true },
  { Icon: Phone, label: "Phone", value: contact.phone, href: contact.phoneHref, detail: "During opening hours." },
  { Icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}`, detail: "For anything that needs a written answer, like changing your account email." },
];

const selfServe = [
  { Icon: Package, title: "Where's my order?", text: "Each order's timeline shows where it is.", to: "/account/orders" },
  { Icon: RotateCcw, title: "Returning a book", text: "Start a return from a delivered order.", to: "/returns-policy" },
  { Icon: HelpCircle, title: "Questions & answers", text: "Paying, delivery, accounts and reviews.", to: "/faq" },
];

/*
 * /contact: direct ways to reach the shop (no form: links that open Telegram,
 * the phone or email), opening hours, and the answers people usually write in for.
 * The details are placeholders from src/content/shop.ts until the owner confirms them.
 */
export default function ContactPage() {
  useDocumentTitle("Contact us");
  return (
    <div className="container-shell pb-20 pt-6 sm:pt-8">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Contact us" }]} />
      <Bookplate
        className="mt-4"
        eyebrow="Help"
        title="Contact us"
        lead={
          <>
            Have your order number ready: it starts with <span className="font-semibold text-on-lapis">ORD-</span> and is on your order confirmation and in
            your account.
          </>
        }
      />

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="channels" className="lg:col-span-7">
          <h2 id="channels" className="font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
            Talk to us
            <ToConfirm confirmed={contact.confirmed} />
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
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
                    <span className="text-[1.25rem] font-semibold [overflow-wrap:anywhere] tabular-nums text-foreground underline-offset-4 group-hover:text-primary group-hover:underline">
                      {value}
                    </span>
                    <span className="text-[15px] text-muted-foreground">{detail}</span>
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  {external ? <span className="sr-only">(opens Telegram)</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="visit" className="grid content-start gap-6 lg:col-span-4 lg:col-start-9">
          <section className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="visit" className="font-display text-[1.563rem] leading-tight">
              Opening hours
              <ToConfirm confirmed={contact.confirmed} />
            </h2>
            <dl className="grid gap-2 text-[15px]">
              {contact.hours.map((h) => (
                <div key={h.days} className="flex items-baseline justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="size-4" aria-hidden="true" />
                    {h.days}
                  </dt>
                  <dd className="font-semibold tabular-nums">{h.time}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-1 border-t border-border pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="size-4 text-primary" aria-hidden="true" /> Shop address
              </p>
              <address className="not-italic text-muted-foreground">
                {contact.address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
            <p className="text-sm text-muted-foreground">Times are Phnom Penh time.</p>
          </section>
        </aside>
      </div>

      <section aria-labelledby="self-serve" className="mt-16">
        <h2 id="self-serve" className="font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
          You might not need to write
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
                  <span className="font-semibold group-hover:text-primary">{title}</span>
                  <span className="text-[15px] text-muted-foreground">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
