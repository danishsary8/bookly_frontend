import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { PageHeader } from "@/components/catalog/PageHeader";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/* /categories/:slug — the catalogue with the category locked in. Categories have no detail endpoint, so the slug is looked up in the (cached) list. */
export default function CategoryPage() {
  const { slug } = useParams();
  const categories = useQuery(catalogQueries.categories());
  const category = categories.data?.find((c) => c.slug === slug);
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(category?.name, { description: category ? p.categoryMeta(category.name ?? "") : null });

  if (categories.isError) return <div className="container-shell py-16"><ErrorState error={categories.error} onRetry={() => categories.refetch()} headingLevel="h1" /></div>;
  if (categories.data && !category) return <NotFoundState what={p.whatCategory} backTo="/books" backLabel={p.browseAll} />;

  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: p.books, to: "/books" }, { label: category?.name ?? p.category }]}
        eyebrow={p.category}
        title={category?.name ?? <span aria-hidden="true" className="skeleton inline-block h-12 w-64 max-w-full rounded-sm align-middle" />}
        lead={category ? p.categoryLead(category.books_count ?? 0, category.name ?? "") : undefined}
      />
      {category?.id ? <CatalogBrowser locked={{ category_id: category.id }} /> : null}
    </div>
  );
}
