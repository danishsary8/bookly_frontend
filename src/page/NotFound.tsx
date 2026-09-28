import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { CtaGlare } from "../components/CtaGlare";

/*
 * 404 inside the storefront layout. Uses the hero surface (.hero-lapis: radial glow +
 * book-spine texture), which MASTER §2.1a now allows for full-page error/empty states.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const search = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/browse?search=${encodeURIComponent(q)}` : "/browse");
  };

  return (
    <div className="section-wrap py-8 lg:py-12">
      <section className="hero-lapis grid gap-10 px-6 py-12 sm:px-10 lg:grid-cols-12 lg:items-center lg:px-14 lg:py-20">
        <div className="lg:col-span-7">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-4 text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.04] text-on-lapis">This page is out of print.</h1>
          <p className="mt-4 max-w-xl text-lg text-on-lapis-muted">
            The link may be old, or the address has a typo. Search the shop, or head back to the front of the store.
          </p>

          <form onSubmit={search} role="search" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label htmlFor="notfound-search" className="sr-only">Search books</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="notfound-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title, author or category"
                className="h-12 w-full rounded-md border border-transparent bg-card pl-10 pr-3.5 text-base text-foreground placeholder:text-muted-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lapis"
              />
            </div>
            <CtaGlare>
              <Button type="submit" variant="cta" size="lg" className="w-full sm:w-auto">
                Search the shop
                <ArrowRight aria-hidden="true" />
              </Button>
            </CtaGlare>
          </form>

          <nav aria-label="Helpful links" className="mt-8">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {[
                { to: "/", label: "Home" },
                { to: "/browse", label: "All books" },
                { to: "/orders", label: "Your orders" },
                { to: "/favorites", label: "Wishlist" },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="inline-flex min-h-11 items-center font-semibold text-on-lapis underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-6 break-all text-sm text-on-lapis-muted">
            Not found: <code className="font-mono text-on-lapis">{location.pathname}</code>
          </p>
        </div>

        <p aria-hidden="true" className="select-none text-center font-display text-[clamp(7rem,18vw,14rem)] leading-none text-gold lg:col-span-5">
          404
        </p>
      </section>
    </div>
  );
};

export default NotFound;
