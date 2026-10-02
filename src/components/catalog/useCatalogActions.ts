import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { accountApi, accountKeys } from "@/api/endpoints/account";
import { cartApi, cartKeys } from "@/api/endpoints/cart";
import { catalogQueries } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { BookCard, BookVariant } from "@/api/types";
import { formatLabel } from "@/lib/catalog";
import { openShellPanel } from "@/stores/shell";
import { toast } from "@/stores/toast";

/*
 * Add to cart and wishlist from anywhere in the catalogue. Both need an account:
 * a signed-out visitor gets a toast with a Sign in link that returns here.
 */

const loginPath = (returnTo: string) => `/login?next=${encodeURIComponent(returnTo)}`;

function useSignInPrompt() {
  const location = useLocation();
  return (what: string) =>
    toast.info({
      title: `Sign in to ${what}`,
      description: "It only takes a moment, and your cart and wishlist follow you to any device.",
      action: { label: "Sign in", href: loginPath(location.pathname + location.search) },
    });
}

/** The cheapest format that can be bought right now. */
export const pickVariant = (variants: BookVariant[] | undefined) =>
  (variants ?? []).filter((v) => v.in_stock && v.id).sort((a, b) => Number(a.price_usd) - Number(b.price_usd))[0];

export function useAddToCart() {
  const session = useSession("customer");
  const queryClient = useQueryClient();
  const promptSignIn = useSignInPrompt();

  const mutation = useMutation({
    mutationFn: async ({ book, variantId, quantity = 1 }: { book: BookCard; variantId?: number; quantity?: number }) => {
      let variant: BookVariant | undefined;
      if (variantId) {
        variant = { id: variantId };
      } else {
        // Cards don't carry formats' ids: read the book (usually cached) and take the cheapest in stock.
        const detail = await queryClient.fetchQuery(catalogQueries.book(book.id!));
        variant = pickVariant(detail.variants);
        if (!variant) throw new ApiError({ kind: "conflict", status: 409, message: `${book.title} is out of stock.` });
      }
      const cart = await cartApi.addItem(variant.id!, quantity);
      return { cart, line: cart.items?.find((item) => item.book_variant_id === variant!.id) };
    },
    onSuccess: ({ cart, line }, { book }) => {
      queryClient.setQueryData(cartKeys.cart(), cart);
      toast.success({
        title: "Added to cart",
        description: [book.title, line?.format ? formatLabel(line.format) : null].filter(Boolean).join(" · "),
        action: { label: "View cart", onClick: () => openShellPanel("cart") },
      });
    },
    onError: (error) => toast.error({ title: "Couldn't add to cart", description: ApiError.from(error).message }),
  });

  return {
    add: (book: BookCard, variantId?: number, quantity?: number) => {
      if (!session) return promptSignIn("add books to your cart");
      if (!book.id) return;
      mutation.mutate({ book, variantId, quantity });
    },
    pendingBookId: mutation.isPending ? mutation.variables?.book.id : undefined,
  };
}

/** Saved book ids for the signed-in customer (first 100), and a toggle that updates them optimistically. */
export function useWishlist() {
  const session = useSession("customer");
  const queryClient = useQueryClient();
  const promptSignIn = useSignInPrompt();
  const params = { per_page: 100 };
  const key = accountKeys.wishlist(params);

  const wishlist = useQuery({
    queryKey: key,
    queryFn: () => accountApi.wishlist(params),
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const ids = new Set((session ? wishlist.data?.data ?? [] : []).map((b) => b.id));

  const mutation = useMutation({
    mutationFn: async ({ book, saved }: { book: BookCard; saved: boolean }): Promise<void> => {
      if (saved) await accountApi.removeFromWishlist(book.id!);
      else await accountApi.addToWishlist(book.id!);
    },
    onMutate: async ({ book, saved }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NonNullable<typeof wishlist.data>>(key);
      queryClient.setQueryData<NonNullable<typeof wishlist.data>>(key, (old) =>
        old ? { ...old, data: saved ? old.data.filter((b) => b.id !== book.id) : [book, ...old.data] } : old,
      );
      return { previous };
    },
    onSuccess: (_data, { book, saved }) =>
      toast.success(saved ? { title: "Removed from your wishlist", description: book.title } : { title: "Saved to your wishlist", description: book.title, action: { label: "View wishlist", href: "/account/wishlist" } }),
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error({ title: "Couldn't update your wishlist", description: ApiError.from(error).message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["account", "wishlist"] }),
  });

  return {
    isSaved: (bookId: number | undefined) => bookId !== undefined && ids.has(bookId),
    toggle: (book: BookCard) => {
      if (!session) return promptSignIn("save books to your wishlist");
      if (!book.id) return;
      mutation.mutate({ book, saved: ids.has(book.id) });
    },
  };
}
