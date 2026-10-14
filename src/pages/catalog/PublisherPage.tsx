import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { PageHeader } from "@/components/catalog/PageHeader";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/* /publishers/:id — the catalogue with the publisher locked in (looked up in the cached publisher list). */
export default function PublisherPage() {
  const id = Number(useParams().id);
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));
  const publisher = publishers.data?.data.find((item) => item.id === id);
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(publisher?.name, { description: publisher ? p.publisherMeta(publisher.name ?? "") : null });

  if (publishers.isError) return <div className="container-shell py-16"><ErrorState error={publishers.error} onRetry={() => publishers.refetch()} headingLevel="h1" /></div>;
  if (publishers.data && !publisher) return <NotFoundState what={p.whatPublisher} backTo="/books" backLabel={p.browseAll} />;

  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: p.books, to: "/books" }, { label: publisher?.name ?? p.publisher }]}
        eyebrow={p.publisher}
        title={publisher?.name ?? <span aria-hidden="true" className="skeleton inline-block h-12 w-64 max-w-full rounded-sm align-middle" />}
        lead={publisher ? p.publisherLead(publisher.books_count ?? 0, publisher.name ?? "") : undefined}
      />
      {publisher?.id ? <CatalogBrowser locked={{ publisher_id: publisher.id }} /> : null}
    </div>
  );
}
