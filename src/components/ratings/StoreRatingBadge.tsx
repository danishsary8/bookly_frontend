import { useQuery } from "@tanstack/react-query";
import { ratingsApi } from "@/api/endpoints/ratings";
import { useT } from "@/i18n";

export function StoreRatingBadge() {
  const { dict } = useT();
  const query = useQuery({ queryKey: ["store-rating"], queryFn: ratingsApi.store, staleTime: 3600000 });
  if (!query.data || (query.data.count ?? 0) < 10 || query.data.average == null) return null;
  return <p className="text-sm font-semibold tabular-nums">{dict.ratings.store(query.data.average.toFixed(1), query.data.count!)}</p>;
}
