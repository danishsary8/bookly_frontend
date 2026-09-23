import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CreditCard, Minus, Plus, Printer, ReceiptText, ShieldCheck, ShoppingBag, Tag, Trash2, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../components/ui/modal";
import BookCoverImage from "../../components/BookCoverImage";
import customerService from "../../services/customer.service";
import { getAccessToken, getStoredUser } from "../../lib/session";
import { CART_CHANGED_EVENT } from "../../lib/cart";
import type { CartItem, CartResponseData, CheckoutPreview, CustomerInvoice, CustomerProfile } from "../../types/customer.types";
import { alertModal, alertToast } from "../../lib/alerts";
import { printInvoiceReceipt } from "../../lib/receipt";
import { useStorefrontSettings } from "../../contexts/StorefrontSettingsContext";

type PaymentMethod = "card" | "cod";

interface CheckoutForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  paymentMethod: PaymentMethod;
}

const emptyCart: CartResponseData = {
  cart_id: 0,
  item_count: 0,
  subtotal: 0,
  items: [],
};

const emptyPreview: CheckoutPreview = {
  subtotal: 0,
  discountAmount: 0,
  promoCode: null,
  discountedSubtotal: 0,
  shipping: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
};

const Cart = () => {
  const navigate = useNavigate();
  const { settings } = useStorefrontSettings();
  const [cart, setCart] = useState<CartResponseData>(emptyCart);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [pricing, setPricing] = useState<CheckoutPreview>(emptyPreview);
  const [promoCode, setPromoCode] = useState("");
  const deferredPromoCode = useDeferredValue(promoCode.trim());
  const [promoMessage, setPromoMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [placedInvoice, setPlacedInvoice] = useState<CustomerInvoice | null>(null);
  const [form, setForm] = useState<CheckoutForm>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Cambodia",
    paymentMethod: "card",
  });

  const isLoggedIn = Boolean(getAccessToken()) && getStoredUser()?.role === "customer";

  useEffect(() => {
    let isMounted = true;

    const loadCheckoutData = async () => {
      if (!isLoggedIn) {
        setCart(emptyCart);
        setProfile(null);
        setPricing(emptyPreview);
        return;
      }

      try {
        setLoadingMessage("Loading your cart...");
        const [cartData, profileData] = await Promise.all([
          customerService.getCart(),
          customerService.getCurrentProfile(),
        ]);

        if (!isMounted) {
          return;
        }

        setCart(cartData);
        setProfile(profileData);
      } catch (error) {
        console.error(error);
        if (isMounted) {
          alertToast.error("Unable to load cart", "Please try again in a moment.");
        }
      } finally {
        if (isMounted) {
          setLoadingMessage("");
        }
      }
    };

    void loadCheckoutData();

    const handleCartChanged = () => {
      void loadCheckoutData();
    };

    window.addEventListener(CART_CHANGED_EVENT, handleCartChanged);
    return () => {
      isMounted = false;
      window.removeEventListener(CART_CHANGED_EVENT, handleCartChanged);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const fullName = `${profile.first_name} ${profile.last_name}`.trim();
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || fullName,
      email: prev.email || profile.email,
      phone: prev.phone || profile.phone || "",
      address: prev.address || profile.address || "",
      city: prev.city || "",
      country: prev.country || "Cambodia",
    }));
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      if (!isLoggedIn || cart.items.length === 0) {
        setPricing(emptyPreview);
        setPromoMessage("");
        return;
      }

      try {
        const preview = await customerService.previewCheckout(deferredPromoCode || undefined);
        if (!isMounted) {
          return;
        }

        setPricing(preview);
        if (preview.promoCode) {
          setPromoMessage(`Promotion ${preview.promoCode} applied successfully.`);
        } else if (!deferredPromoCode) {
          setPromoMessage("");
        }
      } catch (error: any) {
        if (!isMounted) {
          return;
        }
        if (deferredPromoCode) {
          try {
            const fallbackPreview = await customerService.previewCheckout();
            if (isMounted) {
              setPricing(fallbackPreview);
            }
          } catch {
            setPricing(emptyPreview);
          }
          setPromoMessage(error?.response?.data?.message || "Promotion code could not be applied.");
        } else {
          setPricing(emptyPreview);
          setPromoMessage("");
        }
      }
    };

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, cart.items.length, cart.subtotal, cart.item_count, deferredPromoCode]);

  const items = cart.items;

  const summary = useMemo(() => ({
    subtotal: Number(pricing.subtotal || 0),
    discountAmount: Number(pricing.discountAmount || 0),
    discountedSubtotal: Number(pricing.discountedSubtotal || 0),
    shipping: Number(pricing.shipping || 0),
    tax: Number(pricing.tax || 0),
    total: Number(pricing.total || 0),
  }), [pricing]);

  const updateQty = async (bookId: number, nextQty: number) => {
    try {
      if (nextQty <= 0) {
        const updatedCart = await customerService.removeCartItem(bookId);
        setCart(updatedCart);
        return;
      }

      const updatedCart = await customerService.updateCartItemQuantity(bookId, nextQty);
      setCart(updatedCart);
    } catch (error: any) {
      alertToast.error("Unable to update cart", error?.response?.data?.message || "Please try again.");
    }
  };

  const removeItem = async (bookId: number) => {
    try {
      const updatedCart = await customerService.removeCartItem(bookId);
      setCart(updatedCart);
      alertToast.success("Item removed", "The book was removed from your cart.");
    } catch (error: any) {
      alertToast.error("Unable to remove item", error?.response?.data?.message || "Please try again.");
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      alertToast.warning("Login required", "Please login first to complete checkout.");
      setTimeout(() => navigate("/login"), 600);
      return;
    }

    if (items.length === 0) {
      alertToast.warning("Cart is empty", "Add books before placing an order.");
      return;
    }

    const requiredValues = [form.fullName, form.email, form.phone, form.address, form.city, form.country];
    if (requiredValues.some((value) => !value.trim())) {
      alertToast.warning("Incomplete checkout details", "Please complete all checkout fields.");
      return;
    }

    const shippingAddress = `${form.address}, ${form.city}, ${form.country}`;

    try {
      setLoadingMessage("Placing your order...");
      const invoice = await customerService.checkout(form.paymentMethod, shippingAddress, promoCode || undefined);
      setCart(emptyCart);
      setPricing(emptyPreview);
      setPromoCode("");
      setPromoMessage("");
      setPlacedInvoice(invoice);
    } catch (error: any) {
      await alertModal.error({
        title: "Checkout failed",
        text: error?.response?.data?.message || "We could not complete your purchase.",
      });
    } finally {
      setLoadingMessage("");
    }
  };

  return (
    <div className="w-full">
      <main className="section-wrap py-6 lg:py-10 space-y-6">
        <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.1em] text-primary font-bold">Checkout</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">Your Cart Order</h1>
          <p className="mt-3 text-sm text-foreground/70 max-w-2xl">
            Review books, apply promotions, and place your order with server-calculated totals.
          </p>
        </section>

        {loadingMessage && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
            {loadingMessage}
          </div>
        )}
        {promoMessage && !loadingMessage && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${pricing.promoCode ? "border border-success/30 bg-success/5 text-success" : "border border-accent/30 bg-accent/5 text-accent"}`}>
            {promoMessage}
          </div>
        )}

        {!isLoggedIn ? (
          <section className="rounded-2xl border border-dashed border-border/50 bg-background/50 p-8 text-center">
            <ShoppingBag className="h-8 w-8 text-foreground/40 mx-auto" />
            <h3 className="mt-3 text-xl font-bold text-foreground">Login required</h3>
            <p className="mt-1 text-sm text-foreground/70">Sign in as a customer to use your cart and checkout.</p>
            <Link
              to="/login"
              className="inline-flex mt-5 h-10 px-6 items-center rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200"
            >
              Go to Login
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/50 bg-background/50 p-8 text-center">
                  <ShoppingBag className="h-8 w-8 text-foreground/40 mx-auto" />
                  <h3 className="mt-3 text-xl font-bold text-foreground">Your cart is empty</h3>
                  <p className="mt-1 text-sm text-foreground/70">Add books from the shop to continue checkout.</p>
                  <Link
                    to="/browse"
                    className="inline-flex mt-5 h-10 px-6 items-center rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200"
                  >
                    Browse Books
                  </Link>
                </div>
              ) : (
                items.map((item: CartItem) => (
                  <article key={item.book_id} className="rounded-2xl border border-border/50 bg-card shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative h-28 w-full sm:w-24 rounded-lg border border-border/50 bg-background/50 overflow-hidden shrink-0 flex items-center justify-center">
                        <BookCoverImage src={item.book_img} alt={item.title} className="h-full w-full object-cover" iconClassName="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-primary">{item.category_name}</p>
                        <h3 className="text-lg font-bold text-foreground line-clamp-2">{item.title}</h3>
                        <p className="text-sm text-foreground/60">by {item.author_name}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-lg border border-border/50 bg-background">
                            <button
                              onClick={() => void updateQty(item.book_id, item.quantity - 1)}
                              className="h-9 w-9 grid place-items-center text-foreground/60 hover:text-foreground transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => void updateQty(item.book_id, item.quantity + 1)}
                              className="h-9 w-9 grid place-items-center text-foreground/60 hover:text-foreground transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="text-xl font-bold text-foreground">${Number(item.line_total).toFixed(2)}</p>
                            <button
                              onClick={() => void removeItem(item.book_id)}
                              className="h-9 w-9 rounded-lg border border-border/50 grid place-items-center text-foreground/60 hover:text-destructive hover:border-destructive/40 transition-all duration-200"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-5">
                <h2 className="text-xl font-bold text-foreground">Order Summary</h2>

                <div className="mt-4 rounded-xl border border-border/50 bg-background/60 p-3">
                  <label className="text-xs uppercase tracking-[0.08em] text-foreground/60 font-medium">Promotion Code</label>
                  <div className="mt-2 flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                      <input
                        value={promoCode}
                        onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="h-10 w-full rounded-lg border border-border/50 bg-background px-3 pl-10 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromoCode("")}
                      className="h-10 rounded-lg border border-border/50 px-4 text-sm font-medium text-foreground hover:bg-background/80 transition-all duration-200"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-foreground/70">
                    <span>Subtotal</span>
                    <span>${summary.subtotal.toFixed(2)}</span>
                  </div>
                  {summary.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-success">
                      <span>Discount {pricing.promoCode ? `(${pricing.promoCode})` : ""}</span>
                      <span>-${summary.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-foreground/70">
                    <span>Shipping</span>
                    <span>{summary.shipping === 0 ? "Free" : `$${summary.shipping.toFixed(2)}`}</span>
                  </div>
                  {summary.tax > 0 ? (
                    <div className="flex items-center justify-between text-foreground/70">
                      <span>Tax</span>
                      <span>${summary.tax.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="pt-3 mt-3 border-t border-border/30 flex items-center justify-between">
                    <span className="text-base font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-foreground">${summary.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePlaceOrder} className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 space-y-3">
                <h2 className="text-xl font-bold text-foreground">Checkout Details</h2>
                <div className="grid grid-cols-1 gap-2.5">
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Full name"
                    className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                  />
                  <input
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                    className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                  />
                  <input
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address"
                    className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                    />
                    <input
                      value={form.country}
                      onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                      placeholder="Country"
                      className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                  <p className="text-sm font-medium text-foreground mb-2.5">Payment</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, paymentMethod: "card" }))}
                      className={`h-10 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-2 transition-all duration-200 ${
                        form.paymentMethod === "card" ? "border-primary bg-primary text-primary-foreground" : "border-border/50 text-foreground hover:bg-background/50"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, paymentMethod: "cod" }))}
                      className={`h-10 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        form.paymentMethod === "cod" ? "border-primary bg-primary text-primary-foreground" : "border-border/50 text-foreground hover:bg-background/50"
                      }`}
                    >
                      Cash
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-success text-success-foreground font-medium hover:bg-success/90 inline-flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Place Order
                </button>
                <p className="text-xs text-foreground/60 inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Secure checkout, promotion support, and tracked shipping.
                </p>
              </form>
            </aside>
          </section>
        )}
      </main>

      <Modal
        isOpen={Boolean(placedInvoice)}
        onClose={() => setPlacedInvoice(null)}
        title={placedInvoice ? `Invoice ${placedInvoice.id}` : "Invoice"}
        maxWidthClass="max-w-4xl"
      >
        {placedInvoice ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-success">Purchase Successful</p>
                  <h3 className="mt-2 text-2xl font-bold text-foreground">Your order has been placed</h3>
                  <p className="mt-2 text-sm text-foreground/70">
                    Keep this invoice for your records. You can also review it later from your invoice history.
                  </p>
                </div>
                <div className="rounded-2xl border border-success/20 bg-white px-4 py-3 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/50">Total</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">${placedInvoice.total.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">Invoice</p>
                <p className="mt-2 text-sm font-bold text-foreground">{placedInvoice.id}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">Date</p>
                <p className="mt-2 text-sm font-bold text-foreground">{new Date(placedInvoice.createdAt).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">Payment</p>
                <p className="mt-2 text-sm font-bold text-foreground">{placedInvoice.paymentMethod === "card" ? "Card" : "Cash on delivery"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">Status</p>
                <p className="mt-2 text-sm font-bold text-foreground uppercase">{placedInvoice.status}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/50">
              <div className="grid grid-cols-[1.45fr_0.45fr_0.6fr] bg-background/50 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-foreground/60">
                <span>Book</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              {placedInvoice.items.map((item) => (
                <div key={`${placedInvoice.id}-${item.id}`} className="grid grid-cols-[1.45fr_0.45fr_0.6fr] border-t border-border/30 px-4 py-3 text-sm text-foreground/80">
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-foreground/60">by {item.author_name}</p>
                  </div>
                  <span>{item.quantity}</span>
                  <span className="font-semibold text-foreground">${Number(item.total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.85fr]">
              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">Shipping Address</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{placedInvoice.shippingAddress}</p>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between text-foreground/70">
                  <span>Subtotal</span>
                  <span>${placedInvoice.subtotal.toFixed(2)}</span>
                </div>
                {placedInvoice.discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-success">
                    <span>Discount {placedInvoice.promoCode ? `(${placedInvoice.promoCode})` : ""}</span>
                    <span>-${placedInvoice.discountAmount.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-foreground/70">
                  <span>Shipping</span>
                  <span>${placedInvoice.shipping.toFixed(2)}</span>
                </div>
                {placedInvoice.tax > 0 ? (
                  <div className="flex items-center justify-between text-foreground/70">
                    <span>Tax</span>
                    <span>${placedInvoice.tax.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-border/30 pt-2 text-base font-bold text-foreground">
                  <span>Total</span>
                  <span>${placedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => printInvoiceReceipt(placedInvoice, settings)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border/50 px-5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-background/80"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlacedInvoice(null);
                  navigate("/browse");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 px-5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-background/80"
              >
                Continue Shopping
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlacedInvoice(null);
                  navigate("/invoices");
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
              >
                <ReceiptText className="h-4 w-4" />
                View Invoices
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Cart;
