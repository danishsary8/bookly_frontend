import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { coversOf, useCatalogListing } from "@/components/catalog/catalogListing";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/* /publishers/:id (pages/catalogue-v2.md §4): the catalogue with the publisher locked in (looked up in the cached
   publisher list), then books like theirs from other houses. */
export default function PublisherPage() {
  const id = Number(useParams().id);
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));
  const publisher = publishers.data?.data.find((item) => item.id === id);
  const { dict } = useT();
  const p = dict.pages;
  const listing = useCatalogListing({ publisher_id: publisher?.id }, Boolean(publisher?.id));
  useDocumentTitle(publisher?.name, { description: publisher ? p.publisherMeta(publisher.name ?? "") : null });

  if (publishers.isError) return <div className="container-shell py-16"><ErrorState error={publishers.error} onRetry={() => publishers.refetch()} headingLevel="h1" /></div>;
  if (publishers.data && !publisher) return <NotFoundState what={p.whatPublisher} backTo="/books" backLabel={p.browseAll} />;

  const ownBooks = (listing.data?.data ?? []).map((b) => b.id);
  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
        variant="entity"
        crumbs={[{ label: p.home, to: "/" }, { label: p.books, to: "/books" }, { label: publisher?.name ?? p.publisher }]}
        eyebrow={p.publisher}
        title={publisher?.name ?? <span aria-hidden="true" className="skeleton inline-block h-10 w-64 max-w-full rounded-sm align-middle" />}
        lead={publisher ? p.publisherLead(publisher.books_count ?? 0, publisher.name ?? "") : undefined}
        covers={coversOf(listing.data?.data)}
      />
      {publisher?.id ? (
        <div className="grid gap-14">
          <CatalogBrowser locked={{ publisher_id: publisher.id }} />
          {ownBooks.length > 0 ? <RelatedShelf id={`publisher-${publisher.id}-similar`} title={dict.catalogue.moreLikeThese} source={{ kind: "similar", seeds: ownBooks, exclude: ownBooks }} /> : null}
        </div>
      ) : null}
    </div>
  );
}
