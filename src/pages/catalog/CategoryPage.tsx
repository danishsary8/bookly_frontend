import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { Crumb } from "@/components/Breadcrumb";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { coversOf, useCatalogListing } from "@/components/catalog/catalogListing";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * /categories/:slug (pages/catalogue-v2.md §4): the catalogue with the category locked in. The header names the
 * category, its count and its family: sub-categories of a top-level one, or "All {parent}" and the siblings of a
 * sub-category, so moving around the tree is one tap. Grade/level chips (Education) come from the browser.
 * Categories have no detail endpoint, so the slug is looked up in the cached tree.
 */
export default function CategoryPage() {
  const { slug } = useParams();
  const categories = useQuery(catalogQueries.categories());
  const tree = useQuery(catalogQueries.categoryTree());
  const category = categories.data?.find((c) => c.slug === slug);
  const { dict } = useT();
  const p = dict.pages;
  const listing = useCatalogListing({ category_id: category?.id }, Boolean(category?.id));
  useDocumentTitle(category?.name, { description: category ? p.categoryMeta(category.name ?? "") : null });

  if (categories.isError) return <div className="container-shell py-16"><ErrorState error={categories.error} onRetry={() => categories.refetch()} headingLevel="h1" /></div>;
  if (categories.data && !category) return <NotFoundState what={p.whatCategory} backTo="/books" backLabel={p.browseAll} />;

  const parent = category?.parent_id ? tree.data?.find((n) => n.id === category.parent_id) : undefined;
  const node = tree.data?.find((n) => n.id === category?.id) ?? parent?.children?.find((n) => n.id === category?.id);
  const family = (parent ? parent.children : node?.children) ?? [];
  const total = node?.total_books ?? category?.books_count ?? listing.data?.meta.total ?? 0;
  const crumbs: Crumb[] = [{ label: p.home, to: "/" }, { label: p.books, to: "/books" }];
  if (parent) crumbs.push({ label: parent.name ?? "", to: `/categories/${parent.slug}` });
  crumbs.push({ label: category?.name ?? p.category });

  const pill = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40 hover:bg-lapis-tint hover:text-primary",
    );

  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
        variant="entity"
        crumbs={crumbs}
        eyebrow={parent?.name ?? p.category}
        title={category?.name ?? <span aria-hidden="true" className="skeleton inline-block h-10 w-64 max-w-full rounded-sm align-middle" />}
        lead={category ? p.categoryLead(total, category.name ?? "") : undefined}
        covers={coversOf(listing.data?.data)}
        facts={
          family.length > 0 ? (
            <nav aria-label={dict.categorySubNav.subcategories}>
              <ul className="flex flex-wrap gap-2">
                {parent ? (
                  <li>
                    <Link to={`/categories/${parent.slug}`} className={pill(false)}>
                      {dict.catalogue.allOfCategory(parent.name ?? "")}
                    </Link>
                  </li>
                ) : null}
                {family.map((child) => {
                  const current = child.id === category?.id;
                  return (
                    <li key={child.id}>
                      <Link to={`/categories/${child.slug}`} aria-current={current ? "page" : undefined} className={pill(current)}>
                        {child.name}
                        <span className={cn("text-xs tabular-nums", current ? "text-primary-foreground/80" : "text-muted-foreground")}>{child.total_books ?? child.books_count ?? 0}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : undefined
        }
      />
      {category?.id ? (
        <div className="grid gap-14">
          <CatalogBrowser locked={{ category_id: category.id }} />
          <RelatedShelf
            id={`category-${category.id}-best`}
            title={dict.shopExtras.categoryBest(category.name ?? "")}
            source={{ kind: "filter", filters: { category_id: category.id, sort: "best_selling" } }}
            seeAllHref={`/books?category_id=${category.id}&sort=best_selling`}
          />
        </div>
      ) : null}
    </div>
  );
}
