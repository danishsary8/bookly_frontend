import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { opsApi } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { OfferForm } from "@/features/admin/offers/OfferForm";

const back = (
  <Link to="/admin/offers" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
    <ArrowLeft className="size-4" aria-hidden="true" /> All offers
  </Link>
);

/* /admin/offers/new and /admin/offers/:id: the offer editor as its own page (owner 2026-11-17). */
export default function OfferEditPage() {
  const navigate = useNavigate();
  const raw = useParams().id;
  const isNew = raw === undefined;
  const id = Number(raw);
  const offer = useQuery({ queryKey: ["staff", "offers", "one", id], queryFn: () => opsApi.offer(id), enabled: !isNew && Number.isInteger(id) && id > 0 });
  const done = () => navigate("/admin/offers");

  if (isNew) {
    return (
      <AdminPage title="New offer" lead="An automatic discount like “Buy 2, save 15%”. Customers need no code." back={back}>
        <OfferForm offer={null} onClose={done} />
      </AdminPage>
    );
  }
  if (!Number.isInteger(id) || id <= 0 || (offer.isError && ApiError.from(offer.error).kind === "not_found")) return <NotFoundState what="offer" backTo="/admin/offers" backLabel="All offers" />;
  if (offer.isError) return <ErrorState error={offer.error} onRetry={() => offer.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!offer.data)
    return (
      <SkeletonGroup label="Loading offer…" className="mx-auto grid w-full max-w-[1200px] gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 rounded-xl" />
      </SkeletonGroup>
    );
  return (
    <AdminPage title={`Edit ${offer.data.name}`} lead="Changes apply to new orders; orders that already got the offer keep their discount." back={back}>
      <OfferForm key={offer.data.id} offer={offer.data} onClose={done} />
    </AdminPage>
  );
}
