import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { coversOf, useCatalogListing } from "@/components/catalog/catalogListing";
import { CatalogRows } from "@/components/catalog/CatalogRows";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { PageHeader } from "@/components/catalog/PageHeader";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/* /categories/:slug — the catalogue with the category locked in. Categories have no detail endpoint, so the slug is looked up in the (cached) list. */
export default function CategoryPage() {
  const { slug } = useParams();
  const categories = useQuery(catalogQueries.categories());
  const tree = useQuery(catalogQueries.categoryTree());
  const category = categories.data?.find((c) => c.slug === slug);
  const { dict } = useT();
  const p = dict.pages;
  const t = dict.categorySubNav;
  const listing = useCatalogListing({ category_id: category?.id }, Boolean(category?.id));
  useDocumentTitle(category?.name, { description: category ? p.categoryMeta(category.name ?? "") : null });

  if (categories.isError) return <div className="container-shell py-16"><ErrorState error={categories.error} onRetry={() => categories.refetch()} headingLevel="h1" /></div>;
  if (categories.data && !category) return <NotFoundState what={p.whatCategory} backTo="/books" backLabel={p.browseAll} />;

  // Top-level category with children: show wrapping row of links.
  const isTopLevel = category ? !category.parent_id : false;
  const treeNode = isTopLevel && category ? tree.data?.find((n) => n.id === category.id) : null;
  const children = treeNode?.children ?? [];

  // Sub-category: find parent to show "← Back to <parent>"
  const parentCategory = category?.parent_id ? categories.data?.find((c) => c.id === category.parent_id) : null;

  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: p.books, to: "/books" }, { label: category?.name ?? p.category }]}
        eyebrow={p.category}
        title={category?.name ?? <span aria-hidden="true" className="skeleton inline-block h-12 w-64 max-w-full rounded-sm align-middle" />}
        lead={category ? p.categoryLead(category.books_count ?? 0, category.name ?? "") : undefined}
        variant="panel"
        covers={category?.id ? coversOf(listing.data?.data) : undefined}
      />
      {parentCategory ? (
        <div className="mb-6">
          <Link
            to={`/categories/${parentCategory.slug}`}
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md transition-colors"
          >
            {t.backToParent(parentCategory.name ?? "")}
          </Link>
        </div>
      ) : null}
      {children.length > 0 ? (
        <nav aria-label={t.subcategories} className="mb-8">
          <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
            {children.map((child) => {
              const count = child.books_count ?? child.total_books ?? 0;
              return (
                <li key={child.id}>
                  <Link
                    to={`/categories/${child.slug}`}
                    className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[0_8px_18px_-16px_rgb(20_32_122/0.6)] transition-colors hover:border-primary/40 hover:bg-lapis-tint hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>{child.name}</span>{" "}
                    <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">· {count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
      {category?.id ? <div className="grid gap-12"><CatalogRows categoryId={category.id} categoryName={category.name} /><CatalogBrowser locked={{ category_id: category.id }} /></div> : null}
    </div>
  );
}
