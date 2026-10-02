import { useQuery } from "@tanstack/react-query";
import { BookOpen, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { cartQueries } from "@/api/endpoints/cart";
import { useSession } from "@/api/session";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { closeShellPanel, openShellPanel, useShellPanel } from "@/stores/shell";

/*
 * MASTER §6.19 cart drawer, Phase 2 shell: every state (signed out, loading,
 * error, empty, lines) and the footer with subtotal, View cart and Checkout.
 * Lines are read-only here; quantity, remove and coupons come with the cart
 * phase, which reuses this drawer.
 */

const FORMAT_LABEL: Record<string, string> = {
  hardcover: "Hardcover",
  paperback: "Paperback",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

function CartBody() {
  const session = useSession("customer");
  const currency = useCurrency();
  const cart = useQuery({ ...cartQueries.cart(), enabled: Boolean(session) });

  if (!session) {
    return (
      <EmptyState
        icon={ShoppingBag}
        headingLevel="h3"
        title="Sign in to see your cart"
        description="Your cart is saved to your account, so it follows you to any device."
        action={
          <Link to="/login" onClick={closeShellPanel} className={buttonVariants({ variant: "default" })}>
            Sign in
          </Link>
        }
        secondaryAction={
          <Link to="/register" onClick={closeShellPanel} className={buttonVariants({ variant: "link" })}>
            Create an account
          </Link>
        }
      />
    );
  }

  if (cart.isPending) {
    return (
      <SkeletonGroup label="Loading your cart…" className="grid gap-5">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </SkeletonGroup>
    );
  }

  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => cart.refetch()} headingLevel="h3" showHomeLink={false} />;

  const items = cart.data.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        headingLevel="h3"
        title="Your cart is empty"
        description="Books you add will wait here until you're ready to check out."
        action={
          <Link to="/books" onClick={closeShellPanel} className={buttonVariants({ variant: "default" })}>
            Browse books
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid gap-5" aria-label="Items in your cart">
      {items.map((line) => (
        <li key={line.id} className="flex gap-3">
          <span className="grid h-[72px] w-12 shrink-0 place-items-center overflow-hidden rounded-[2px] bg-surface-2">
            {line.cover_image_url ? (
              <img src={line.cover_image_url} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <BookOpen className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to={`/books/${line.book?.id}`}
              onClick={closeShellPanel}
              className="line-clamp-2 font-semibold leading-snug text-foreground underline-offset-4 hover:underline"
            >
              {line.book?.title}
            </Link>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {FORMAT_LABEL[line.format ?? ""] ?? line.format} · Qty {line.quantity}
            </p>
            {line.issues?.length ? <p className="mt-1 text-sm text-warning">{line.issues[0]?.message}</p> : null}
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(line.line_total_usd, line.line_total_khr, currency)}</p>
        </li>
      ))}
    </ul>
  );
}

function CartSummary() {
  const session = useSession("customer");
  const currency = useCurrency();
  const cart = useQuery({ ...cartQueries.cart(), enabled: Boolean(session) });
  if (!session || !cart.data?.items?.length) return null;

  return (
    <DrawerFooter className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">Subtotal</span>
        <span className="text-lg font-semibold tabular-nums">{formatMoney(cart.data.subtotal_usd, cart.data.subtotal_khr, currency)}</span>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">Shipping and discounts are worked out at checkout.</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/cart" onClick={closeShellPanel} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          View cart
        </Link>
        <Link
          to="/checkout"
          onClick={closeShellPanel}
          aria-disabled={cart.data.can_checkout === false || undefined}
          className={cn(buttonVariants({ variant: "cta" }), "w-full", cart.data.can_checkout === false && "pointer-events-none opacity-40")}
        >
          Checkout
        </Link>
      </div>
    </DrawerFooter>
  );
}

export function CartDrawer() {
  const panel = useShellPanel();
  const session = useSession("customer");
  const cart = useQuery({ ...cartQueries.cart(), enabled: Boolean(session) });
  const count = session ? (cart.data?.item_count ?? 0) : 0;

  return (
    <Drawer open={panel === "cart"} onOpenChange={(open) => (open ? openShellPanel("cart") : closeShellPanel())}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle>
            Your cart{count > 0 ? <span className="font-sans text-base font-semibold text-muted-foreground"> ({count})</span> : null}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Books in your cart and the subtotal.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <CartBody />
        </DrawerBody>
        <CartSummary />
      </DrawerContent>
    </Drawer>
  );
}
