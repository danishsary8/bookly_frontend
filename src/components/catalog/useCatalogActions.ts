import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { accountApi, accountKeys } from "@/api/endpoints/account";
import { cartApi, cartKeys } from "@/api/endpoints/cart";
import { catalogQueries } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { BookCard, BookVariant, Customer } from "@/api/types";
import { withNext } from "@/lib/forms";
import { openShellPanel } from "@/stores/shell";
import { toast } from "@/stores/toast";
import { isVerified, needsVerifying } from "@/features/auth/verification";
import { formatName, getDict } from "@/i18n";

/*
 * Add to cart and wishlist from anywhere in the catalogue. Both need a verified
 * account; see useAccountGate for what other visitors are told.
 */

/*
 * Returns a function that checks the visitor can use cart/wishlist and, if not,
 * explains why with a link that comes back here: signed out → Sign in; signed in
 * but email not verified (the API refuses these actions until then) → Verify email.
 */
function useAccountGate() {
  const location = useLocation();
  const session = useSession<Customer>("customer");
  const here = location.pathname + location.search;
  const promptVerify = () =>
    toast.info({
      title: getDict().cartPage.verifyFirst,
      description: getDict().cartPage.verifyFirstLead,
      action: { label: getDict().cartPage.verifyEmail, href: withNext("/verify-email", here) },
    });
  const check = (what: "signInToCart" | "signInToWishlist") => {
    if (!session) {
      toast.info({
        title: getDict().cartPage[what],
        description: getDict().cartPage.signInLead,
        action: { label: getDict().cartPage.signIn, href: withNext("/login", here) },
      });
      return false;
    }
    if (needsVerifying(session.user)) {
      promptVerify();
      return false;
    }
    return true;
  };
  return { check, promptVerify };
}

/** The cheapest format that can be bought right now. */
export const pickVariant = (variants: BookVariant[] | undefined) =>
  (variants ?? []).filter((v) => v.in_stock && v.id).sort((a, b) => Number(a.price_usd) - Number(b.price_usd))[0];

export function useAddToCart() {
  const queryClient = useQueryClient();
  const gate = useAccountGate();

  const mutation = useMutation({
    mutationFn: async ({ book, variantId, quantity = 1 }: { book: BookCard; variantId?: number; quantity?: number }) => {
      let variant: BookVariant | undefined;
      if (variantId) {
        variant = { id: variantId };
      } else {
        // Cards don't carry formats' ids: read the book (usually cached) and take the cheapest in stock.
        const detail = await queryClient.fetchQuery(catalogQueries.book(book.id!));
        variant = pickVariant(detail.variants);
        if (!variant) throw new ApiError({ kind: "conflict", status: 409, message: getDict().cartPage.outOfStock(book.title ?? "") });
      }
      const cart = await cartApi.addItem(variant.id!, quantity);
      return { cart, line: cart.items?.find((item) => item.book_variant_id === variant!.id) };
    },
    onSuccess: ({ cart, line }, { book }) => {
      queryClient.setQueryData(cartKeys.cart(), cart);
      toast.success({
        title: getDict().cartPage.added,
        description: [book.title, line?.format ? formatName(getDict(), line.format) : null].filter(Boolean).join(" · "),
        action: { label: getDict().cartPage.viewCart, onClick: () => openShellPanel("cart") },
      });
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      if (apiError.kind === "email_unverified") return gate.promptVerify();
      toast.error({ title: getDict().cartPage.addFailed, description: apiError.message });
    },
  });

  return {
    add: (book: BookCard, variantId?: number, quantity?: number) => {
      if (!gate.check("signInToCart") || !book.id) return;
      mutation.mutate({ book, variantId, quantity });
    },
    pendingBookId: mutation.isPending ? mutation.variables?.book.id : undefined,
  };
}

/** Saved book ids for the signed-in customer (first 100), and a toggle that updates them optimistically. */
export function useWishlist() {
  const session = useSession<Customer>("customer");
  const queryClient = useQueryClient();
  const gate = useAccountGate();
  const params = { per_page: 100 };
  const key = accountKeys.wishlist(params);

  const wishlist = useQuery({
    queryKey: key,
    queryFn: () => accountApi.wishlist(params),
    // Unverified accounts can't read the wishlist yet (the API answers 403).
    enabled: Boolean(session) && isVerified(session?.user),
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
      toast.success(
        saved
          ? // Removing is one click, so it can be undone from the toast.
            { title: getDict().cartPage.unsaved, description: book.title, action: { label: getDict().cartPage.undo, onClick: () => mutation.mutate({ book, saved: false }) } }
          : { title: getDict().cartPage.saved, description: book.title, action: { label: getDict().cartPage.viewWishlist, href: "/account/wishlist" } },
      ),
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      const apiError = ApiError.from(error);
      if (apiError.kind === "email_unverified") return gate.promptVerify();
      toast.error({ title: getDict().cartPage.wishlistFailed, description: apiError.message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["account", "wishlist"] }),
  });

  return {
    isSaved: (bookId: number | undefined) => bookId !== undefined && ids.has(bookId),
    toggle: (book: BookCard) => {
      if (!gate.check("signInToWishlist") || !book.id) return;
      mutation.mutate({ book, saved: ids.has(book.id) });
    },
  };
}
