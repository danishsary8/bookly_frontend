import { useQuery } from "@tanstack/react-query";
import { cartQueries } from "@/api/endpoints/cart";
import { useSession } from "@/api/session";

/** Number of items in the signed-in customer's cart; 0 when signed out. */
export function useCartCount() {
  const session = useSession("customer");
  const cart = useQuery({ ...cartQueries.cart(), enabled: Boolean(session), staleTime: 30_000 });
  return session ? (cart.data?.item_count ?? 0) : 0;
}
