import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { coversOf, useCatalogListing } from "@/components/catalog/catalogListing";
import { CatalogueHeader as PageHeader } from "@/components/catalog/CatalogueHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

export default function BooksPage() {
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(dict.catalog.allBooks, { description: p.allBooksMeta });
  const listing = useCatalogListing();
  return (
    <div className="catalogue-v2 container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: dict.catalog.title }]}
        eyebrow={p.catalogue}
        title={<>{dict.catalog.allBooks}{listing.data?.meta?.total !== undefined ? <span className="ml-3 inline-block align-middle font-sans text-base tabular-nums text-muted-foreground">{p.bookCount(listing.data.meta.total)}</span> : null}</>}
        lead={p.booksLead}
        covers={coversOf(listing.data?.data)}
      />
      <CatalogBrowser />
    </div>
  );
}
