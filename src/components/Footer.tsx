import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useStorefrontSettings } from "../contexts/StorefrontSettingsContext";
import AnimatedContent from "./AnimatedContent";

/*
 * MASTER §6.13 footer: lapis tint in Daylight, card surface with a hairline in Night.
 * 4 columns → 1 on mobile; every link is a 44px target with an underline on hover.
 * (Social and Privacy/Terms links were `href="#"` placeholders with no real URLs, so
 * they are omitted until real destinations exist.)
 */

const linkClass =
  "inline-flex min-h-11 items-center text-foreground underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline";

const Footer = () => {
  const { settings } = useStorefrontSettings();

  return (
    <footer className="mt-16 border-t border-border bg-lapis-tint dark:bg-card">
      <AnimatedContent distance={30} duration={0.7}>
        <div className="section-wrap grid gap-10 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-80" aria-label={`${settings.store_name} home`}>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="font-display text-xl text-primary">{settings.store_name}</span>
            </Link>
            <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
              A bookstore for Cambodia: hand-picked titles, cash on delivery, and delivery across the country.
            </p>
          </div>

          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shop</h2>
            <ul className="mt-3 grid">
              <li><Link to="/browse" className={linkClass}>All books</Link></li>
              <li><Link to="/favorites" className={linkClass}>Wishlist</Link></li>
              <li><Link to="/cart" className={linkClass}>Cart</Link></li>
              <li><Link to="/orders" className={linkClass}>Your orders</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Customer care</h2>
            <ul className="mt-3 grid gap-1 text-base text-foreground">
              <li className="py-2.5 text-muted-foreground">Mon–Fri, 8:00–18:00</li>
              <li><a href={`mailto:${settings.support_email}`} className={linkClass}>{settings.support_email}</a></li>
              {settings.support_phone ? <li className="py-2.5 tabular-nums">{settings.support_phone}</li> : null}
              <li className="py-2.5 text-muted-foreground">Phnom Penh, Cambodia</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border">
          <p className="section-wrap py-5 text-sm text-muted-foreground">
            © {new Date().getFullYear()} {settings.store_name}. All rights reserved.
          </p>
        </div>
      </AnimatedContent>
    </footer>
  );
};

export default Footer;
