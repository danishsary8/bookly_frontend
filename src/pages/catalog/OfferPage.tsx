import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Layers, ShoppingCart, Sparkles, Repeat } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { catalogQueries } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import type { Resource } from "@/api/types";
import { BookGrid } from "@/components/catalog/BookGrid";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { offerKind, offerMoney } from "@/features/offers/offerKind";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { useT } from "@/i18n";

/*
 * /offers/:id (owner 2026-11-26): the page of a bundle offer ("any 5 books for $20"): what the deal is, how it works,
 * and every book it covers, so customers can pick their bundle. An offer that has ended answers 404 here.
 */

type PublicOffer = {
  id: number;
  name: string;
  type: string;
  min_quantity: number;
  percent_off: string;
  amount_off: string | null;
  bundle_price: string | null;
  ends_at: string | null;
  target_label: string | null;
  free_delivery: boolean;
};

const STEP_ICONS = [ShoppingCart, Sparkles, Repeat];

export default function OfferPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const { dict, locale } = useT();
  const o = dict.offers;
  const p = dict.pages;

  const offer = useQuery({
    queryKey: ["catalog", "offer", id],
    queryFn: () => api.get<Resource<PublicOffer>>(`/offers/${id}`).then((r) => r.data),
    enabled: valid,
  });
  const books = useQuery({ ...catalogQueries.books({ offer_id: id, page, per_page: 24, sort: "best_selling" }), enabled: valid && offer.isSuccess });
  const showSkeleton = useSkeletonVisible(offer.isPending || books.isPending);

  const data = offer.data;
  const bundle = data && offerKind(data) === "bundle";
  const price = offerMoney(data?.bundle_price);
  const n = data?.min_quantity ?? 0;
  useDocumentTitle(data ? (bundle ? o.page.title(n, price) : data.name) : undefined);

  if (!valid || (offer.isError && ApiError.from(offer.error).kind === "not_found")) {
    return <NotFoundState what={o.page.what} backTo="/books" backLabel={dict.homePage.allBooks} />;
  }
  if (offer.isError) return <div className="container-shell py-16"><ErrorState error={offer.error} onRetry={() => offer.refetch()} headingLevel="h1" /></div>;

  const list = books.data?.data ?? [];
  const meta = books.data?.meta;

  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
        variant="entity"
        crumbs={[{ label: p.home, to: "/" }, { label: p.books, to: "/books" }, { label: o.page.eyebrow }]}
        eyebrow={o.page.eyebrow}
        title={data ? (bundle ? o.page.title(n, price) : data.name) : <span aria-hidden="true" className="skeleton inline-block h-10 w-72 max-w-full rounded-sm align-middle" />}
        blurb={bundle ? o.page.lead(n, price) : undefined}
        covers={list.slice(0, 5).map((b) => ({ src: b.cover_image_url, title: b.title }))}
        facts={
          data ? (
            <>
              {meta ? <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{p.bookCount(meta.total ?? 0)}</span> : null}
              {data.ends_at ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <CalendarClock className="size-4" aria-hidden="true" />
                  {o.ends(orderDate(data.ends_at, locale))}
                </span>
              ) : null}
              {data.free_delivery ? <span className="font-semibold text-success">{o.freeDelivery}</span> : null}
            </>
          ) : undefined
        }
      />

      {bundle ? (
        <section aria-label={o.page.eyebrow} className="mb-10 grid gap-4 rounded-2xl border border-accent/25 bg-accent/[0.06] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground" aria-hidden="true">
              <Layers className="size-5" />
            </span>
            <p className="font-display text-2xl leading-tight text-foreground">{o.bundleBadge(n, price)}</p>
          </div>
          <ol className="grid gap-2.5 sm:grid-cols-3">
            {o.page.steps(n).map((step, i) => {
              const Icon = STEP_ICONS[i] ?? Sparkles;
              return (
                <li key={step} className="flex items-center gap-3 rounded-xl bg-card px-3.5 py-3 text-sm font-medium text-foreground shadow-2xs ring-1 ring-border/70">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <span>{step}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-sm text-muted-foreground">{o.page.leftover}</p>
        </section>
      ) : null}

      <BookGrid
        books={list}
        loading={(offer.isPending || books.isPending) && showSkeleton}
        headingLevel="h2"
        instancePrefix={`offer-${id}`}
        empty={books.isPending || offer.isPending ? null : <EmptyState icon={Layers} title={o.page.empty} description={o.page.emptyHint} />}
      />
      {meta && (meta.last_page ?? 1) > 1 ? (
        <Pagination page={meta.current_page ?? 1} lastPage={meta.last_page ?? 1} hrefFor={(n) => (n > 1 ? `?page=${n}` : "?")} className="mt-10" />
      ) : null}
    </div>
  );
}
