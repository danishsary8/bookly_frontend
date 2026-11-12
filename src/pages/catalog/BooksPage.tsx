import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { coversOf, useCatalogListing } from "@/components/catalog/catalogListing";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/* /books (pages/catalogue-v2.md §4): the whole shop. Home's "See all" links land here with their filter or sort. */
export default function BooksPage() {
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(dict.catalog.allBooks, { description: p.allBooksMeta });
  const listing = useCatalogListing();
  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
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
