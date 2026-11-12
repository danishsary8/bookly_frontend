import { useQuery } from "@tanstack/react-query";
import { rewardQueries } from "@/api/endpoints/rewards";
import { useSession } from "@/api/session";

/** The customer's first usable reward coupon (GET /me/coupons; an older API or an error means none). */
export function useUsableRewardCoupon() {
  const session = useSession("customer");
  const coupons = useQuery({ ...rewardQueries.myCoupons(), enabled: Boolean(session), retry: false });
  return coupons.data?.find((c) => c.is_usable) ?? null;
}
