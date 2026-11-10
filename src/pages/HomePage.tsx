import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RotateCcw, Truck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { BookShelf } from "@/components/catalog/BookShelf";
import { collectionQueries, collectionText } from "@/api/endpoints/collections";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { HomeHero } from "@/components/home/HomeHero";
import { ContinueStrip } from "@/components/home/ContinueStrip";
import { TopRated } from "@/components/home/TopRated";
import { ComingSoon } from "@/components/home/ComingSoon";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { ShelfHero } from "@/components/home/ShelfHero";
import { StaffPicks } from "@/components/home/StaffPicks";
import { StoreRatingBadge } from "@/components/ratings/StoreRatingBadge";
import AnimatedContent from "@/components/AnimatedContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useRecentlyViewed } from "@/stores/recentlyViewed";
import { useT } from "@/i18n";

/*
 * Home (pages/home.md): search-first hero → 3D shelf → continue strip → categories → staff picks →
 * series spotlight → authors → recently viewed. Each section loads on its own,
 * so a slow or failing request only affects that section.
 */

function SectionHeading({ id, eyebrow, title, action }: { id: string; eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
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
  const { dict, lang } = useT();
  const h = dict.homePage;
  // Seasonal collections (owner 2026-11-01): up to 2 live ones, above New arrivals. None, or an older API: no row.
  const collections = useQuery(collectionQueries.live());
  // Hero carousel: staff picks first (if any), then the shop's most popular books, 15 in all.
  const picks = useQuery({ queryKey: ["reading-lists", "picks"], queryFn: readingListsApi.picks });
  const popular = useQuery(catalogQueries.books({ sort: "best_selling", per_page: 15 }));
  const picked = (picks.data ?? []).flatMap((list) => list.books.flatMap((entry) => (entry.book ? [entry.book] : [])));
  const newest = useQuery(catalogQueries.books({ sort: "newest", per_page: 12 }));
  const featured = [...picked, ...(popular.data?.data ?? [])].filter((b, i, all) => all.findIndex((x) => x.id === b.id) === i).slice(0, 15);
  const categories = useQuery(catalogQueries.categories());
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
      <HomeHero
featured={popular.isPending && picks.isPending ? undefined : featured}
        label={dict.home.popularBooks}
      />
      {/* Full-bleed paper band with the 3D shelf. */}
      <div className="home-paper border-b border-border">
        <ShelfHero />
      </div>
      <div className="container-shell grid gap-24 pb-10 pt-16">
        {/* Order (pages/home.md): hero → shelf → continue → categories → new arrivals → top rated → coming soon → staff picks / seasonal → promises. */}
        <ContinueStrip books={recent} />
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
        <AnimatedContent distance={32} duration={0.7} threshold={0.1}>
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
        </AnimatedContent>
        <AnimatedContent distance={32} duration={0.7} threshold={0.1}>
          <TopRated />
        </AnimatedContent>
        <AnimatedContent distance={32} duration={0.7} threshold={0.1}>
          <ComingSoon />
        </AnimatedContent>
        <StaffPicks />
        {(collections.data ?? []).map((c) => {
          const text = collectionText(c, lang);
          return (
            <BookShelf
              key={c.id}
              id={`collection-${c.slug}`}
              eyebrow={dict.collections.eyebrow}
              title={text.title}
              books={c.books}
              seeAllHref={`/collections/${c.slug}`}
              seeAllLabel={dict.collections.seeAll}
            />
          );
        })}
        <div className="grid gap-6">
          <ul className="grid gap-4 sm:grid-cols-3" aria-label={h.why}>
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
          <StoreRatingBadge />
        </div>
      </div>
    </div>
  );
}
