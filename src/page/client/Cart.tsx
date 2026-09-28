import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, LogIn, ShoppingBag, Trash2 } from "lucide-react";
import customerService from "../../services/customer.service";
import type { CartItem, CartResponseData } from "../../types/customer.types";
import { getAccessToken, getStoredUser } from "../../lib/session";
import { alertToast } from "../../lib/alerts";
import { formatPrice, lineTotal, toNumber } from "../../lib/format";
import { useSkeletonVisible } from "../../hooks/useSkeletonVisible";
import BookCoverImage from "../../components/BookCoverImage";
import { Button } from "../../components/ui/button";
import { CtaGlare } from "../../components/CtaGlare";
import { EmptyState } from "../../components/EmptyState";
import { QuantityStepper } from "../../components/QuantityStepper";

const SAVE_DELAY_MS = 450;
const MAX_PER_ITEM = 99;

/*
 * Cart (MASTER 8/4 layout): items with quantity steppers on the left, a summary with the
 * subtotal and the single vermilion "Proceed to checkout" on the right. Shipping, tax and
 * promo codes are server-calculated on /checkout.
 *
 * Quantity changes are optimistic and saved after a short pause, so rapid +/+/+ becomes
 * one request. While a row has an unsaved change, server responses for *other* rows
 * don't overwrite its quantity.
 */

const recalc = (cart: CartResponseData): CartResponseData => {
  const items = cart.items.map((item) => ({ ...item, line_total: lineTotal(item.price, item.quantity) }));
  return {
    ...cart,
    items,
    item_count: items.reduce((n, item) => n + item.quantity, 0),
    subtotal: Math.round(items.reduce((sum, item) => sum + toNumber(item.line_total) * 100, 0)) / 100,
  };
};

const normalise = (cart: CartResponseData): CartResponseData => ({
  ...cart,
  subtotal: toNumber(cart.subtotal),
  item_count: toNumber(cart.item_count),
  items: cart.items.map((item) => ({
    ...item,
    book_id: toNumber(item.book_id),
    quantity: toNumber(item.quantity),
    price: toNumber(item.price),
    line_total: toNumber(item.line_total),
    stock: item.stock === undefined || item.stock === null ? undefined : toNumber(item.stock),
  })),
});

const CartRowSkeleton = () => (
  <div className="flex gap-4 rounded-xl border border-border bg-card p-4" aria-hidden="true">
    <div className="skeleton aspect-[2/3] w-20 shrink-0 rounded-sm" />
    <div className="grid flex-1 content-start gap-2">
      <div className="skeleton h-3 w-1/4 rounded-sm" />
      <div className="skeleton h-5 w-2/3 rounded-sm" />
      <div className="skeleton h-4 w-1/3 rounded-sm" />
      <div className="skeleton mt-2 h-11 w-36 rounded-lg" />
    </div>
  </div>
);

const Cart = () => {
  const navigate = useNavigate();
  const isCustomer = Boolean(getAccessToken()) && getStoredUser()?.role === "customer";

  const [cart, setCart] = useState<CartResponseData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [removing, setRemoving] = useState<Record<number, boolean>>({});
  const timers = useRef<Record<number, number>>({});
  const confirmed = useRef<Record<number, number>>({}); // last quantity the server accepted, per book
  const showSkeleton = useSkeletonVisible(isCustomer && !cart && !loadError);

  const applyServerCart = (serverCart: CartResponseData) => {
    const next = normalise(serverCart);
    next.items.forEach((item) => { confirmed.current[item.book_id] = item.quantity; });
    setCart((prev) => {
      if (!prev) return next;
      // Keep the on-screen quantity for rows that still have a save queued.
      const merged = {
        ...next,
        items: next.items.map((item) => {
          const local = prev.items.find((p) => p.book_id === item.book_id);
          return local && timers.current[item.book_id] ? { ...item, quantity: local.quantity } : item;
        }),
      };
      return recalc(merged);
    });
  };

  useEffect(() => {
    if (!isCustomer) return;
    let active = true;
    customerService
      .getCart()
      .then((data) => active && applyServerCart(data))
      .catch(() => active && setLoadError(true));
    const pending = timers.current;
    return () => {
      active = false;
      Object.values(pending).forEach((t) => window.clearTimeout(t));
    };
  }, [isCustomer]);

  const saveQuantity = async (item: CartItem, quantity: number) => {
    delete timers.current[item.book_id];
    setSaving((s) => ({ ...s, [item.book_id]: true }));
    try {
      applyServerCart(await customerService.updateCartItemQuantity(item.book_id, quantity));
    } catch (error: any) {
      // Put the row back to what the server last accepted.
      const previous = confirmed.current[item.book_id] ?? item.quantity;
      setCart((prev) => prev && recalc({ ...prev, items: prev.items.map((i) => (i.book_id === item.book_id ? { ...i, quantity: previous } : i)) }));
      alertToast.error("Couldn't update quantity", error?.response?.data?.message || `${item.title} is back to ${previous}.`);
    } finally {
      setSaving((s) => ({ ...s, [item.book_id]: false }));
    }
  };

  const changeQuantity = (item: CartItem, quantity: number) => {
    setCart((prev) => prev && recalc({ ...prev, items: prev.items.map((i) => (i.book_id === item.book_id ? { ...i, quantity } : i)) }));
    setSaving((s) => ({ ...s, [item.book_id]: true }));
    window.clearTimeout(timers.current[item.book_id]);
    timers.current[item.book_id] = window.setTimeout(() => void saveQuantity(item, quantity), SAVE_DELAY_MS);
  };

  const removeItem = async (item: CartItem) => {
    window.clearTimeout(timers.current[item.book_id]);
    delete timers.current[item.book_id];
    setRemoving((s) => ({ ...s, [item.book_id]: true }));
    try {
      applyServerCart(await customerService.removeCartItem(item.book_id));
    } catch (error: any) {
      alertToast.error("Couldn't remove book", error?.response?.data?.message || "Try again in a moment.");
      return;
    } finally {
      setRemoving((s) => ({ ...s, [item.book_id]: false }));
    }

    const undo = await alertToast.withAction("success", "Removed from cart", item.title, "Undo");
    if (!undo) return;
    try {
      applyServerCart(await customerService.addCartItem(item.book_id, item.quantity));
      alertToast.success("Back in your cart", item.title);
    } catch (error: any) {
      alertToast.error("Couldn't restore book", error?.response?.data?.message || "Add it again from the shop.");
    }
  };

  const heading = (
    <header className="mb-8">
      <p className="eyebrow">Your bag</p>
      <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">Cart</h1>
    </header>
  );

  if (!isCustomer) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {heading}
        <EmptyState
          icon={LogIn}
          title="Sign in to see your cart"
          description="Your cart is saved to your account, so it's there on any device."
          action={<Button asChild><Link to="/login" state={{ from: "/cart" }}>Sign in</Link></Button>}
          secondaryAction={<Button asChild variant="link"><Link to="/register">Create an account</Link></Button>}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {heading}
        <EmptyState
          icon={ShoppingBag}
          title="Your cart didn't load"
          description="Check your connection and try again."
          action={<Button onClick={() => window.location.reload()}>Try again</Button>}
        />
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {heading}
        {showSkeleton ? (
          <div aria-busy="true" className="grid gap-4 lg:w-8/12">
            <span className="sr-only">Loading your cart…</span>
            <CartRowSkeleton />
            <CartRowSkeleton />
          </div>
        ) : null}
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {heading}
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Books you add will wait here until you're ready to check out."
          action={<Button asChild><Link to="/browse">Browse books</Link></Button>}
        />
      </div>
    );
  }

  const isBusy = Object.values(saving).some(Boolean);

  return (
    <div className="section-wrap py-8 lg:py-12">
      {heading}

      <div className="grid gap-8 lg:grid-cols-12">
        <section aria-label="Books in your cart" className="lg:col-span-8">
          <ul className="grid gap-4">
            {cart.items.map((item) => {
              const max = Math.max(1, Math.min(item.stock ?? MAX_PER_ITEM, MAX_PER_ITEM));
              return (
                <li key={item.book_id} className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-shadow duration-200 hover:shadow-lift sm:gap-5">
                  <Link to={`/books/${item.book_id}`} className="block aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-sm bg-surface-2 transition-opacity duration-150 hover:opacity-85 sm:w-24" tabIndex={-1} aria-hidden="true">
                    <BookCoverImage src={item.book_img} alt="" className="h-full w-full object-cover" iconClassName="h-6 w-6" />
                  </Link>

                  <div className="grid min-w-0 flex-1 content-start gap-1">
                    {item.category_name ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-text">{item.category_name}</p> : null}
                    <h2 className="text-lg leading-snug">
                      <Link to={`/books/${item.book_id}`} className="text-foreground underline-offset-4 hover:underline">{item.title}</Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">by {item.author_name} · <span className="tabular-nums">{formatPrice(item.price)}</span> each</p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <QuantityStepper
                          label={`Quantity of ${item.title}`}
                          value={item.quantity}
                          min={1}
                          max={max}
                          onChange={(q) => changeQuantity(item, q)}
                          disabled={removing[item.book_id]}
                        />
                        <span className="min-w-16 text-sm text-muted-foreground" aria-live="polite">
                          {saving[item.book_id] ? "Saving…" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold tabular-nums text-foreground">{formatPrice(item.line_total)}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void removeItem(item)}
                          disabled={removing[item.book_id]}
                          aria-label={`Remove ${item.title} from cart`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          {removing[item.book_id] ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside aria-labelledby="summary-title" className="lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-28">
            <h2 id="summary-title" className="text-[1.563rem] leading-tight text-foreground">Summary</h2>
            <dl className="mt-5 grid gap-3 text-base">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Books</dt>
                <dd className="tabular-nums text-foreground">{cart.item_count}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <dt className="font-semibold text-foreground">Subtotal</dt>
                <dd className="text-xl font-semibold tabular-nums text-foreground">{formatPrice(cart.subtotal)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">Shipping, tax and promo codes are worked out at checkout.</p>

            <CtaGlare block className="mt-6">
              <Button variant="cta" size="lg" className="w-full" disabled={isBusy} onClick={() => navigate("/checkout")}>
                Proceed to checkout
                <ArrowRight aria-hidden="true" />
              </Button>
            </CtaGlare>
            {isBusy ? <p className="mt-2 text-center text-sm text-muted-foreground">Saving your changes…</p> : null}
            <Button asChild variant="link" className="mt-3 w-full justify-center">
              <Link to="/browse">Continue shopping</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
