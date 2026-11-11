import { useQuery } from "@tanstack/react-query";
import { ArrowRight, QrCode, RotateCcw, Truck, Wallet } from "lucide-react";
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
import { interleave, useCategoryLanes } from "@/components/home/useMixedPicks";
import AnimatedContent from "@/components/AnimatedContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useRecentlyViewed } from "@/stores/recentlyViewed";
import { cn } from "@/lib/utils";
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
  { Icon: QrCode, title: "khqr", text: "khqrText" },
  { Icon: Truck, title: "delivery", text: "deliveryText" },
  { Icon: RotateCcw, title: "returns", text: "returnsText" },
] as const;

export default function HomePage() {
  useDocumentTitle("Bookly");
  const { dict, lang } = useT();
  const h = dict.homePage;
  // Seasonal collections (owner 2026-11-01): up to 2 live ones, above New arrivals. None, or an older API: no row.
  const collections = useQuery(collectionQueries.live());
  // Hero carousel (owner 2026-11-11): 20 books dealt in turns from staff picks + the most popular books, and from the
  // best sellers of each big category (self-help, comics, kids …), so the slides mix genres.
  const picks = useQuery({ queryKey: ["reading-lists", "picks"], queryFn: readingListsApi.picks });
  const popular = useQuery(catalogQueries.books({ sort: "best_selling", per_page: 15 }));
  const picked = (picks.data ?? []).flatMap((list) => list.books.flatMap((entry) => (entry.book ? [entry.book] : [])));
  const mixed = useCategoryLanes();
  const newest = useQuery(catalogQueries.books({ sort: "newest", per_page: 12 }));
  const featured = interleave([[...picked, ...(popular.data?.data ?? [])], ...mixed.lanes], 20);
  const heroLoading = (popular.isPending && picks.isPending) || mixed.pending;
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
    <div className="home-paper overflow-x-clip pb-16">
      <JsonLd data={websiteJsonLd} />
      <HomeHero featured={heroLoading ? undefined : featured} label={dict.home.popularBooks} />
      {/* The 3D shelf sits on the same page colour as everything else (one calm background, no band). */}
      <ShelfHero />
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
        {/* Why shop here (home refresh 2026-11-11): a lapis band in the hero's and bookplate's language — a fine gold frame,
            the label in gold, four promises with gold-ringed icons, divided by gold hairlines. Facts only. */}
        <section aria-labelledby="promises-title" className="hero-lapis promise-band relative overflow-hidden rounded-3xl p-2 sm:p-3">
          <div className="promise-frame relative grid gap-6 rounded-[1.1rem] px-6 py-8 sm:px-10 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:py-10">
            <div>
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                <span className="h-px w-8 bg-current opacity-70" aria-hidden="true" />
                Bookly
              </p>
              <h2 id="promises-title" className="mt-3 font-display text-[1.9rem] leading-[1.1] text-on-lapis">
                {h.why}
              </h2>
            </div>
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
              {promises.map(({ Icon, title, text }, i) => (
                <li key={title} className={cn("group grid content-start gap-3", i > 0 && "xl:border-l xl:border-gold/25 xl:pl-8")}>
                  <span className="grid size-12 place-items-center rounded-full text-gold ring-1 ring-gold/50 transition-[transform,background-color] duration-300 group-hover:-translate-y-0.5 group-hover:bg-gold/10 motion-reduce:transform-none">
                    <Icon className="size-[22px]" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-display text-[1.2rem] leading-tight text-on-lapis">{h[title]}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-on-lapis-muted">{h[text]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
