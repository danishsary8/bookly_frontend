import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import { AuthorAvatar } from "@/components/catalog/AuthorAvatar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { coversOf, useCatalogListing } from "@/components/catalog/catalogListing";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { ErrorState } from "@/components/ui/error-state";
import { JsonLd } from "@/components/seo/JsonLd";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/*
 * /authors/:id (pages/catalogue-v2.md §4): portrait (or initials), name, the bio clamped with Read more, the book
 * count and a way back to every author; then their books with the full catalogue tools; then "Readers also like",
 * books similar to theirs by other writers.
 */
export default function AuthorPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const author = useQuery({ ...catalogQueries.author(id), enabled: valid });
  const listing = useCatalogListing({ author_id: id }, valid);
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(author.data?.name, {
    description: author.data?.bio || (author.data ? p.authorMeta(author.data.name ?? "") : null),
    image: author.data?.photo_url,
    type: "profile",
  });

  if (!valid || (author.isError && ApiError.from(author.error).kind === "not_found")) {
    return <NotFoundState what={p.whatAuthor} backTo="/authors" backLabel={p.allAuthors} />;
  }
  if (author.isError) return <div className="container-shell py-16"><ErrorState error={author.error} onRetry={() => author.refetch()} headingLevel="h1" /></div>;

  const name = author.data?.name;
  const ownBooks = (listing.data?.data ?? []).map((b) => b.id);
  return (
    <div className="container-shell pb-16">
      {author.data ? <JsonLd data={{ "@context": "https://schema.org", "@type": "Person", name, description: author.data.bio || undefined, image: author.data.photo_url || undefined }} /> : null}
      <CatalogueHeader
        variant="entity"
        crumbs={[{ label: p.home, to: "/" }, { label: p.authors, to: "/authors" }, { label: name ?? p.author }]}
        eyebrow={p.author}
        media={name ? <AuthorAvatar name={name} photoUrl={author.data?.photo_url} className="size-20 text-3xl ring-4 ring-lapis-tint sm:size-24" /> : undefined}
        title={name ?? <span aria-hidden="true" className="skeleton inline-block h-10 w-72 max-w-full rounded-sm align-middle" />}
        blurb={author.data?.bio}
        covers={coversOf(listing.data?.data)}
        facts={
          author.data ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{p.bookCount(author.data.books_count ?? 0)}</span>
              <Link to="/authors" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
                {p.allAuthors}
              </Link>
            </>
          ) : undefined
        }
      />
      <div className="grid gap-14">
        <CatalogBrowser locked={{ author_id: id }} />
        {ownBooks.length > 0 ? (
          <RelatedShelf id={`author-${id}-similar`} title={dict.catalogue.readersAlsoLike} source={{ kind: "similar", seeds: ownBooks, exclude: ownBooks }} />
        ) : null}
      </div>
    </div>
  );
}
