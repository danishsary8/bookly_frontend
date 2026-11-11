import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { coversOf, useCatalogListing } from "@/components/catalog/catalogListing";
import { PageHeader } from "@/components/catalog/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

export default function BooksPage() {
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(dict.catalog.allBooks, { description: p.allBooksMeta });
  const listing = useCatalogListing();
  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: dict.catalog.title }]}
        eyebrow={p.catalogue}
        title={dict.catalog.allBooks}
        lead={p.booksLead}
        covers={coversOf(listing.data?.data)}
      />
      <CatalogBrowser />
    </div>
  );
}
