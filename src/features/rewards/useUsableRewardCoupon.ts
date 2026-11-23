import { useQuery } from "@tanstack/react-query";
import { rewardQueries, type RewardCoupon } from "@/api/endpoints/rewards";
import { useSession } from "@/api/session";

const EMPTY: RewardCoupon[] = [];

/** All usable reward coupons on the customer's account (GET /me/coupons; an older API or error means none). */
export function useUsableRewardCoupons(): RewardCoupon[] {
  const session = useSession("customer");
  const coupons = useQuery({ ...rewardQueries.myCoupons(), enabled: Boolean(session), retry: false });
  if (!coupons.data) return EMPTY;
  return coupons.data.filter((c) => c.is_usable);
}

/** The customer's first usable reward coupon. */
export function useUsableRewardCoupon(): RewardCoupon | null {
  return useUsableRewardCoupons()[0] ?? null;
}
