import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { opsApi } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { CollectionForm } from "@/features/admin/collections/CollectionForm";

const back = (
  <Link to="/admin/collections" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
    <ArrowLeft className="size-4" aria-hidden="true" /> All collections
  </Link>
);

/* /admin/collections/new and /admin/collections/:id: the collection editor as its own page (owner 2026-11-17). */
export default function CollectionEditPage() {
  const navigate = useNavigate();
  const raw = useParams().id;
  const isNew = raw === undefined;
  const id = Number(raw);
  const collection = useQuery({ queryKey: ["staff", "collections", "one", id], queryFn: () => opsApi.collection(id), enabled: !isNew && Number.isInteger(id) && id > 0 });
  const done = () => navigate("/admin/collections");

  if (isNew) {
    return (
      <AdminPage title="New collection" lead="A hand-picked shelf like “Rainy season reads”. While it is live it shows as a row on the home page and has its own page." back={back}>
        <CollectionForm collection={null} onClose={done} />
      </AdminPage>
    );
  }
  if (!Number.isInteger(id) || id <= 0 || (collection.isError && ApiError.from(collection.error).kind === "not_found")) return <NotFoundState what="collection" backTo="/admin/collections" backLabel="All collections" />;
  if (collection.isError) return <ErrorState error={collection.error} onRetry={() => collection.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!collection.data)
    return (
      <SkeletonGroup label="Loading collection…" className="mx-auto grid w-full max-w-[1200px] gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 rounded-xl" />
      </SkeletonGroup>
    );
  return (
    <AdminPage title={`Edit ${collection.data.title_en}`} lead="Changes show on the home page and the collection page straight away." back={back}>
      <CollectionForm key={collection.data.id} collection={collection.data} onClose={done} />
    </AdminPage>
  );
}
