import "./site-footer.css";
import { ArrowUpRight, Banknote, Mail, Phone, QrCode, Send, Truck } from "lucide-react";
import { contact } from "@/content/shop";
import { FaFacebookF, FaInstagram, FaTelegramPlane, FaTiktok, FaYoutube } from "react-icons/fa";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Wordmark } from "./SiteHeader";
import { footerNav, legalNav } from "./nav";
import { useT } from "@/i18n";
import { NewsletterSignup } from "./NewsletterSignup";
import { StoreRatingBadge } from "@/components/ratings/StoreRatingBadge";

/* Editorial navy footer; newsletter behavior and translated navigation remain shared. */

const linkClass =
  "group inline-flex min-h-11 items-center rounded-sm text-[15px] text-foreground/80 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9";

// Platform homepages until the shop provides its own public profiles.
const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/", Icon: FaFacebookF },
  { label: "Instagram", href: "https://www.instagram.com/", Icon: FaInstagram },
  { label: "TikTok", href: "https://www.tiktok.com/", Icon: FaTiktok },
  { label: "YouTube", href: "https://www.youtube.com/", Icon: FaYoutube },
  { label: "Telegram", href: contact.telegramHref, Icon: FaTelegramPlane },
];

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  const { dict } = useT();
  const f = dict.footer;
  return (
    <footer className={cn("bookly-footer mt-16", className)}>
      <div className="container-shell footer-newsletter">
        <div className="footer-newsletter-inner">
          <NewsletterSignup wide />
        </div>
      </div>

      <div className="container-shell footer-directory">
        <div className="footer-brand grid content-start gap-4">
          <Wordmark className="footer-wordmark" />
          <p className="max-w-xs text-[15px] leading-6 text-muted-foreground">{f.tagline}</p>
          <StoreRatingBadge />
          <div className="mt-1 grid gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{f.weAccept}</p>
            <ul className="flex flex-wrap gap-2">
              {[
                { Icon: Banknote, label: f.cod },
                { Icon: QrCode, label: f.khqr },
                { Icon: Truck, label: f.allProvinces },
              ].map(({ Icon, label }) => (
                <li key={label} className="footer-payment">
                  <Icon className="size-4" aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {footerNav.filter((column) => column.title !== "yourAccount").map((column) => (
          <nav key={column.title} aria-labelledby={`footer-${column.title}`}>
            <h2 id={`footer-${column.title}`} className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {dict.navLinks[column.title]}
            </h2>
            <ul className="mt-4 grid gap-0.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    <span className="h-px w-0 bg-current transition-[width,margin] duration-300 group-hover:mr-1.5 group-hover:w-3" aria-hidden="true" />
                    {dict.navLinks[link.label]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <section className="footer-contact" aria-labelledby="footer-contact-title">
          <h2 id="footer-contact-title">{f.contact}</h2>
          <a href={`mailto:${contact.email}`} className="footer-contact-link">
            <Mail className="size-4" aria-hidden="true" />
            <span>{contact.email}</span><ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <a href={contact.phoneHref} className="footer-contact-link">
            <Phone className="size-4" aria-hidden="true" /><span>{contact.phone}</span>
          </a>
          <a href={contact.telegramHref} target="_blank" rel="noopener noreferrer" className="footer-contact-link">
            <Send className="size-4" aria-hidden="true" /><span>Telegram · {contact.telegram}</span><ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <div className="footer-socials">
            {socialLinks.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon aria-hidden="true" /></a>
            ))}
          </div>
          <Link to="/contact" className="footer-contact-page">{dict.navLinks.contact}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </section>
      </div>
      <div className="footer-legal">
        <div className="container-shell flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Bookly. {f.rights}</p>
          <ul className="flex gap-6">
            {legalNav.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">
                  {dict.navLinks[link.label]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
