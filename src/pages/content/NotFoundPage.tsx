import { useState, type FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CtaGlare } from "@/components/CtaGlare";
import { buttonVariants } from "@/components/ui/button";
import { Bookplate } from "@/features/content/Bookplate";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";

const elsewhere = [
  { to: "/books?sort=newest", label: "New arrivals" },
  { to: "/authors", label: "Authors" },
  { to: "/faq", label: "Questions & answers" },
  { to: "/contact", label: "Contact us" },
];

/*
 * Unknown address inside the shop (pages/content.md): the bookplate says the page
 * is "out of print", with a search straight to /search and a few ways back in.
 */
export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/books");
  };

  return (
    <div className="container-shell pb-20 pt-6 sm:pt-8">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Page not found" }]} />
      <Bookplate
        className="mt-4"
        eyebrow="Error 404"
        title="This page is out of print"
        lead="The link may be old, or the address has a typo. Search for the book you were after, or go back to the shelves."
      >
        <form onSubmit={submit} role="search" className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <label htmlFor="notfound-search" className="sr-only">
            Find the book you were looking for
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="notfound-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, author or series"
              autoComplete="off"
              className="h-12 w-full rounded-[4px] border border-transparent bg-card pl-11 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>
          <CtaGlare>
            <button type="submit" className={cn(buttonVariants({ variant: "cta", size: "lg" }), "h-12 w-full sm:w-auto")}>
              Find it <ArrowRight aria-hidden="true" />
            </button>
          </CtaGlare>
        </form>
      </Bookplate>

      <nav aria-label="Elsewhere in the shop" className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
        <span className="mr-2 text-sm font-semibold text-muted-foreground">Or try</span>
        {elsewhere.map((link) => (
          <Link key={link.to} to={link.to} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
