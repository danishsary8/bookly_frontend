import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PageHeader } from "@/components/catalog/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function BooksPage() {
  useDocumentTitle("All books");
  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: "Home", to: "/" }, { label: "Books" }]}
        eyebrow="The catalogue"
        title="All books"
        lead="Classics, new releases and local favourites. Filter by category, format or price."
      />
      <CatalogBrowser />
    </div>
  );
}
