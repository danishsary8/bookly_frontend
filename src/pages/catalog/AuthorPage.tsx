import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import { AuthorAvatar } from "@/components/catalog/AuthorAvatar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { PageHeader } from "@/components/catalog/PageHeader";
import { ErrorState } from "@/components/ui/error-state";
import { JsonLd } from "@/components/seo/JsonLd";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

export default function AuthorPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const author = useQuery({ ...catalogQueries.author(id), enabled: valid });
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(author.data?.name, {
    description: author.data?.bio || (author.data ? p.authorMeta(author.data.name ?? "") : null),
    image: author.data?.photo_url,
    type: "profile",
  });

  const jsonLdData = author.data
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: author.data.name,
        description: author.data.bio || undefined,
        image: author.data.photo_url || undefined,
      }
    : null;

  if (!valid || (author.isError && ApiError.from(author.error).kind === "not_found")) {
    return <NotFoundState what={p.whatAuthor} backTo="/authors" backLabel={p.allAuthors} />;
  }
  if (author.isError) return <div className="container-shell py-16"><ErrorState error={author.error} onRetry={() => author.refetch()} headingLevel="h1" /></div>;

  const name = author.data?.name;
  return (
    <div className="container-shell pb-16">
      {jsonLdData ? <JsonLd data={jsonLdData} /> : null}
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: p.authors, to: "/authors" }, { label: name ?? p.author }]}
        eyebrow={p.author}
        title={
          name ? (
            <span className="flex items-center gap-5">
              <AuthorAvatar name={name} photoUrl={author.data?.photo_url} className="size-20 text-3xl sm:size-24" />
              {name}
            </span>
          ) : (
            <span aria-hidden="true" className="skeleton inline-block h-12 w-72 max-w-full rounded-sm align-middle" />
          )
        }
        lead={author.data?.bio ? <p className="max-w-prose">{author.data.bio}</p> : undefined}
      />
      <CatalogBrowser locked={{ author_id: id }} />
    </div>
  );
}
