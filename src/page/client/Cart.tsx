import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";

import {
  CART_CHANGED_EVENT,
  cartSubtotal,
  clearCart,
  loadCart,
  removeFromCart,
  type CartItem,
  updateCartItemQuantity
} from "../../lib/cart";

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

const Cart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderMessage, setOrderMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isPlaced, setIsPlaced] = useState(false);
  const [form, setForm] = useState<CheckoutForm>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    paymentMethod: "card"
  });

  useEffect(() => {
    const syncCart = () => setItems(loadCart());
    syncCart();
    window.addEventListener(CART_CHANGED_EVENT, syncCart);
    return () => window.removeEventListener(CART_CHANGED_EVENT, syncCart);
  }, []);

  const summary = useMemo(() => {
    const subtotal = cartSubtotal(items);
    const shipping = subtotal > 60 || subtotal === 0 ? 0 : 4.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  }, [items]);

  const isLoggedIn = Boolean(Cookies.get("token"));

  const updateQty = (id: number, nextQty: number) => {
    setItems(updateCartItemQuantity(id, nextQty));
  };

  const removeItem = (id: number) => {
    setItems(removeFromCart(id));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    setOrderMessage("");

    if (!isLoggedIn) {
      setCheckoutError("Please login first to complete checkout.");
      setTimeout(() => navigate("/login"), 600);
      return;
    }

    if (items.length === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }

    const requiredValues = [form.fullName, form.email, form.phone, form.address, form.city, form.country];
    if (requiredValues.some((value) => !value.trim())) {
      setCheckoutError("Please complete all checkout fields.");
      return;
    }

    const orderId = `BK-${Date.now().toString().slice(-8)}`;
    clearCart();
    setItems([]);
    setIsPlaced(true);
    setOrderMessage(`Order ${orderId} placed successfully.`);
  };

  return (
    <div className="w-full">
      <main className="section-wrap py-6 lg:py-10 space-y-6">
        <section className="rounded-[2.25rem] border border-white/70 bg-gradient-to-br from-white/95 via-cyan-50/40 to-emerald-100/35 p-6 md:p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-bold">Checkout</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-black text-slate-900">Your Cart Order</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Review books, set quantity, and place your order in one clean checkout flow.
          </p>
        </section>

        {orderMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {orderMessage}
          </div>
        )}
        {checkoutError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {checkoutError}
          </div>
        )}

        {isPlaced ? (
          <section className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h2 className="mt-3 text-2xl font-black text-slate-900">Order Confirmed</h2>
            <p className="mt-2 text-slate-600">Thanks for your purchase. Your books are being prepared for shipping.</p>
            <Link
              to="/browse"
              className="inline-flex mt-5 h-11 px-6 items-center rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
            >
              Continue Shopping
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
                  <ShoppingBag className="h-8 w-8 text-slate-400 mx-auto" />
                  <h3 className="mt-3 text-xl font-bold text-slate-900">Your cart is empty</h3>
                  <p className="mt-1 text-sm text-slate-600">Add books from the shop to continue checkout.</p>
                  <Link
                    to="/browse"
                    className="inline-flex mt-5 h-10 px-5 items-center rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  >
                    Browse Books
                  </Link>
                </div>
              ) : (
                items.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="h-28 w-full sm:w-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={item.book_img} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-orange-700">{item.category_name}</p>
                        <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{item.title}</h3>
                        <p className="text-sm text-slate-500">by {item.author_name}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                            <button
                              onClick={() => updateQty(item.id, item.quantity - 1)}
                              className="h-9 w-9 grid place-items-center text-slate-600 hover:text-slate-900"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-semibold text-slate-800">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.id, item.quantity + 1)}
                              className="h-9 w-9 grid place-items-center text-slate-600 hover:text-slate-900"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="text-xl font-black text-slate-900">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="h-9 w-9 rounded-lg border border-slate-200 grid place-items-center text-slate-500 hover:text-rose-600 hover:border-rose-200"
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
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-900">Order Summary</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>${summary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Shipping</span>
                    <span>{summary.shipping === 0 ? "Free" : `$${summary.shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tax</span>
                    <span>${summary.tax.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-900">Total</span>
                    <span className="text-2xl font-black text-slate-900">${summary.total.toFixed(2)}</span>
                  </div>
                </div>
                {items.length > 0 && (
                  <button
                    onClick={() => {
                      clearCart();
                      setItems([]);
                    }}
                    className="mt-4 h-10 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              <form onSubmit={handlePlaceOrder} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h2 className="text-xl font-black text-slate-900">Checkout Details</h2>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Full name"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <input
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <input
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <input
                      value={form.country}
                      onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                      placeholder="Country"
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800 mb-2">Payment</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, paymentMethod: "card" }))}
                      className={`h-10 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                        form.paymentMethod === "card" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, paymentMethod: "cod" }))}
                      className={`h-10 rounded-lg border text-sm font-semibold ${
                        form.paymentMethod === "cod" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700"
                      }`}
                    >
                      Cash
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 inline-flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Place Order
                </button>
                <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Secure checkout and tracked shipping.
                </p>
              </form>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
};

export default Cart;
