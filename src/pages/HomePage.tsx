import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RotateCcw, Truck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { AuthorAvatar } from "@/components/catalog/AuthorAvatar";
import { BookShelf } from "@/components/catalog/BookShelf";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { HomeHero } from "@/components/home/HomeHero";
import { SeriesSpotlight } from "@/components/home/SeriesSpotlight";
import AnimatedContent from "@/components/AnimatedContent";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/JsonLd";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { clearRecentlyViewed, useRecentlyViewed } from "@/stores/recentlyViewed";
import { useT } from "@/i18n";

/*
 * Home: hero → service promises → new arrivals → categories → best rated →
 * series spotlight → authors → recently viewed. Each section loads on its own,
 * so a slow or failing request only affects that section.
 */

function SectionHeading({ id, eyebrow, title, action }: { id: string; eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
          <span className="h-px w-12 bg-current" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-2 font-display text-[1.953rem] leading-tight">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

const promises = [
  { Icon: Wallet, title: "cod", text: "codText" },
  { Icon: Truck, title: "delivery", text: "deliveryText" },
  { Icon: RotateCcw, title: "returns", text: "returnsText" },
] as const;

export default function HomePage() {
  useDocumentTitle("Bookly");
  const { dict } = useT();
  const h = dict.homePage;
  const newest = useQuery(catalogQueries.books({ sort: "newest", per_page: 10 }));
  const rated = useQuery(catalogQueries.books({ sort: "rating", per_page: 10 }));
  const categories = useQuery(catalogQueries.categories());
  const series = useQuery(catalogQueries.seriesList({ per_page: 20 }));
  const authors = useQuery(catalogQueries.authors({ per_page: 6 }));
  const recent = useRecentlyViewed();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "BookStore",
    name: "Bookly",
    description:
      "Bookly is an online bookshop in Cambodia: paperbacks, hardcovers and ebooks, prices in dollars or riel, delivered to your door with cash on delivery.",
    url: typeof window !== "undefined" ? window.location.origin : "https://bookly.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${typeof window !== "undefined" ? window.location.origin : ""}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="overflow-x-clip">
      <JsonLd data={websiteJsonLd} />
      <div className="container-shell grid gap-20 pb-8 pt-6 lg:pt-10">
        <HomeHero
          featured={rated.data?.data.slice(0, 5)}
          stats={[
            { label: h.books, value: newest.data?.meta.total },
            { label: h.authors, value: authors.data?.meta.total },
            { label: h.categories, value: categories.data?.length },
          ]}
        />

        <ul className="-mt-8 grid gap-4 sm:grid-cols-3" aria-label={h.why}>
          {promises.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">{h[title]}</span>
                <span className="text-sm text-muted-foreground">{h[text]}</span>
              </span>
            </li>
          ))}
        </ul>

        <BookShelf
          id="new-arrivals"
          eyebrow={h.justIn}
          title={h.newArrivals}
          books={newest.data?.data}
          loading={newest.isPending}
          error={newest.isError ? newest.error : undefined}
          onRetry={() => newest.refetch()}
          seeAllHref="/books?sort=newest"
        />

        <AnimatedContent distance={32} duration={0.7} threshold={0.15}>
          <section aria-labelledby="categories-title">
            <SectionHeading
              id="categories-title"
              eyebrow={h.browse}
              title={h.byCategory}
              action={
                <Link to="/books" className="inline-flex h-11 items-center gap-1.5 px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
                  {h.allBooks} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            />
            <CategoryTiles categories={categories.data} loading={categories.isPending} />
          </section>
        </AnimatedContent>

        <BookShelf
          id="best-rated"
          eyebrow={h.readersLove}
          title={h.bestRated}
          books={rated.data?.data}
          loading={rated.isPending}
          error={rated.isError ? rated.error : undefined}
          onRetry={() => rated.refetch()}
          seeAllHref="/books?sort=rating"
        />

        <AnimatedContent distance={32} duration={0.7} threshold={0.15}>
          <SeriesSpotlight series={series.data?.data} />
        </AnimatedContent>

        {authors.data?.data.length ? (
          <AnimatedContent distance={32} duration={0.7} threshold={0.15}>
            <section aria-labelledby="authors-title">
              <SectionHeading
                id="authors-title"
                eyebrow={h.writers}
                title={h.meetAuthors}
                action={
                  <Link to="/authors" className="inline-flex h-11 items-center gap-1.5 px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
                    {h.allAuthors} <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                }
              />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {authors.data.data.map((author) => (
                  <li key={author.id}>
                    <Link
                      to={`/authors/${author.id}`}
                      className="group grid h-full justify-items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <AuthorAvatar name={author.name ?? ""} photoUrl={author.photo_url} className="size-20 text-2xl transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100" />
                      <span className="font-display text-lg leading-tight underline-offset-4 group-hover:underline">{author.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {dict.pages.bookCount(author.books_count ?? 0)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </AnimatedContent>
        ) : null}

        <BookShelf
          id="recently-viewed"
          eyebrow={h.yourHistory}
          title={h.recentlyViewed}
          books={recent}
          action={
            <Button variant="ghost" size="sm" onClick={clearRecentlyViewed}>
              {h.clear}
            </Button>
          }
        />
      </div>
    </div>
  );
}
