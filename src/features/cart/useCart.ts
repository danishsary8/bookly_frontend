import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartApi, cartKeys, cartQueries } from "@/api/endpoints/cart";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { Cart, CartLine, Customer } from "@/api/types";
import { formatLabel } from "@/lib/catalog";
import { toast } from "@/stores/toast";
import { isVerified } from "@/features/auth/verification";

/** The cart needs a signed-in customer with a verified email (the API answers 403 before that). */
export function useUsableCart() {
  const session = useSession<Customer>("customer");
  const verified = !session || isVerified(session.user);
  const cart = useQuery({ ...cartQueries.cart(), enabled: Boolean(session) && verified });
  return { session, verified, cart };
}

/*
 * Cart edits. Quantity changes show at once (optimistic) and roll back if the
 * API refuses (e.g. not enough stock); every response replaces the cached cart,
 * so the header count, drawer and cart page stay in step. Removing a line can be
 * undone from the toast. Checkout previews are dropped after each change.
 */
export function useCartMutations() {
  const queryClient = useQueryClient();
  const key = cartKeys.cart();

  const settle = (cart: Cart) => {
    queryClient.setQueryData(key, cart);
    queryClient.removeQueries({ queryKey: ["cart", "preview"] });
  };

  const setQuantity = useMutation({
    mutationFn: ({ line, quantity }: { line: CartLine; quantity: number }) => cartApi.setQuantity(line.id!, quantity),
    onMutate: async ({ line, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Cart>(key);
      queryClient.setQueryData<Cart>(key, (old) =>
        old ? { ...old, items: old.items?.map((item) => (item.id === line.id ? { ...item, quantity } : item)) } : old,
      );
      return { previous };
    },
    onSuccess: settle,
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error({ title: "Couldn't change the quantity", description: ApiError.from(error).message });
    },
  });

  const add = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: number; quantity: number }) => cartApi.addItem(variantId, quantity),
    onSuccess: settle,
    onError: (error) => toast.error({ title: "Couldn't put it back", description: ApiError.from(error).message }),
  });

  const remove = useMutation({
    mutationFn: (line: CartLine) => cartApi.removeItem(line.id!),
    onSuccess: (cart, line) => {
      settle(cart);
      toast.success({
        title: "Removed from your cart",
        description: [line.book?.title, formatLabel(line.format)].filter(Boolean).join(" · "),
        action: line.book_variant_id
          ? { label: "Undo", onClick: () => add.mutate({ variantId: line.book_variant_id!, quantity: line.quantity ?? 1 }) }
          : undefined,
      });
    },
    onError: (error) => toast.error({ title: "Couldn't remove it", description: ApiError.from(error).message }),
  });

  const clear = useMutation({
    mutationFn: cartApi.clear,
    onSuccess: (cart) => {
      settle(cart);
      toast.success("Your cart is empty");
    },
    onError: (error) => toast.error({ title: "Couldn't empty the cart", description: ApiError.from(error).message }),
  });

  return {
    setQuantity: (line: CartLine, quantity: number) => setQuantity.mutate({ line, quantity }),
    remove: (line: CartLine) => remove.mutate(line),
    clear: () => clear.mutate(),
    /** id of the line being changed or removed, to disable its controls. */
    busyLineId: setQuantity.isPending ? setQuantity.variables?.line.id : remove.isPending ? remove.variables?.id : undefined,
    clearing: clear.isPending,
  };
}
