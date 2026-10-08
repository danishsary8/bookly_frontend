import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { VerifyChannel } from "@/api/endpoints/auth";
import type { Customer } from "@/api/types";
import { safeNext } from "@/lib/forms";
import { toast } from "@/stores/toast";
import { needsVerifying, rememberChannel, rememberedChannel, verifyPath } from "./verification";

/**
 * Where to go once a customer has a session: unverified accounts go to the verify page first (the API
 * blocks cart, wishlist and checkout until then): the email code, or confirming the phone in Telegram.
 * A Facebook customer whose email is already confirmed but who chose Telegram sees the Telegram step once
 * too, with "Skip for now". Everyone else goes back to `next` or Home. Account data cached for a previous
 * visitor is dropped.
 */
export function useAfterSignIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return (
    customer: Customer | undefined,
    next: string | null,
    greeting?: string,
    options: { justRegistered?: boolean; verifyBy?: VerifyChannel | null } = {},
  ) => {
    queryClient.removeQueries({ queryKey: ["cart"] });
    queryClient.removeQueries({ queryKey: ["account"] });
    if (options.verifyBy) rememberChannel(options.verifyBy);
    const state = { justRegistered: options.justRegistered ?? Boolean(options.verifyBy) };

    if (customer && needsVerifying(customer)) {
      const channel = options.verifyBy ?? rememberedChannel() ?? (customer.email ? "email" : "telegram");
      navigate(verifyPath(channel, next), { replace: true, state });
      return;
    }
    if (customer && options.verifyBy === "telegram" && !customer.phone_verified) {
      if (greeting) toast.success(greeting);
      navigate(verifyPath("telegram", next, { optional: "1" }), { replace: true, state });
      return;
    }
    if (greeting) toast.success(greeting);
    navigate(safeNext(next), { replace: true });
  };
}
