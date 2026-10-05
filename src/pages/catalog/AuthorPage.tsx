import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import { AuthorAvatar } from "@/components/catalog/AuthorAvatar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { PageHeader } from "@/components/catalog/PageHeader";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function AuthorPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const author = useQuery({ ...catalogQueries.author(id), enabled: valid });
  useDocumentTitle(author.data?.name, { description: author.data?.bio || (author.data ? `Books by ${author.data.name} at Bookly.` : null), image: author.data?.photo_url });

  if (!valid || (author.isError && ApiError.from(author.error).kind === "not_found")) {
    return <NotFoundState what="author" backTo="/authors" backLabel="All authors" />;
  }
  if (author.isError) return <div className="container-shell py-16"><ErrorState error={author.error} onRetry={() => author.refetch()} headingLevel="h1" /></div>;

  const name = author.data?.name;
  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: "Home", to: "/" }, { label: "Authors", to: "/authors" }, { label: name ?? "Author" }]}
        eyebrow="Author"
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
