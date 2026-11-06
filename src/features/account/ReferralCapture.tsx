import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { rememberReferral } from "./referralAttribution";

export function ReferralCapture() {
  const flags = useQuery(shopFeaturesQuery());
  const { search } = useLocation();
  useEffect(() => { if (flags.data?.referrals) rememberReferral(search); }, [search, flags.data?.referrals]);
  return null;
}
