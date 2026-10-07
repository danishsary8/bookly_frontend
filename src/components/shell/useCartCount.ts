import { useQuery } from "@tanstack/react-query";
import { cartQueries } from "@/api/endpoints/cart";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { isVerified } from "@/features/auth/verification";

/** Number of items in the signed-in customer's cart; 0 when signed out or not yet verified (the API refuses the cart until then). */
export function useCartCount() {
  const session = useSession<Customer>("customer");
  const usable = Boolean(session) && isVerified(session?.user);
  const cart = useQuery({ ...cartQueries.cart(), enabled: usable, staleTime: 30_000 });
  return usable ? (cart.data?.item_count ?? 0) : 0;
}
