import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Banknote, CreditCard, Loader2, Printer, ReceiptText, ShieldCheck, ShoppingBag } from "lucide-react";
import customerService from "../../services/customer.service";
import type { CartResponseData, CheckoutPreview, CustomerInvoice, CustomerProfile } from "../../types/customer.types";
import { alertModal } from "../../lib/alerts";
import { printInvoiceReceipt } from "../../lib/receipt";
import { formatPrice, toNumber } from "../../lib/format";
import { useStorefrontSettings } from "../../contexts/StorefrontSettingsContext";
import { useSkeletonVisible } from "../../hooks/useSkeletonVisible";
import Modal from "../../components/ui/modal";
import BookCoverImage from "../../components/BookCoverImage";
import { Button } from "../../components/ui/button";
import { Breadcrumb } from "../../components/Breadcrumb";
import { CtaGlare } from "../../components/CtaGlare";
import { EmptyState } from "../../components/EmptyState";
import { FormAlert } from "../../components/form/FormAlert";
import { TextAreaField, TextField } from "../../components/form/Field";
import { cn } from "@/lib/utils";

/*
 * /checkout: moved out of Cart. Logic is unchanged from the old inline checkout:
 * profile pre-fill, server-side price preview (with promo code), and
 * customerService.checkout(paymentMethod, "address, city, country", promo).
 * Only the presentation moved to MASTER tokens/components. Route is customer-only.
 */

type PaymentMethod = "card" | "cod";
type FieldName = "fullName" | "email" | "phone" | "address" | "city" | "country";
type Form = Record<FieldName, string> & { paymentMethod: PaymentMethod };

const emptyPreview: CheckoutPreview = { subtotal: 0, discountAmount: 0, promoCode: null, discountedSubtotal: 0, shipping: 0, tax: 0, total: 0, itemCount: 0 };

const REQUIRED: Record<FieldName, string> = {
  fullName: "Enter the name for delivery.",
  email: "Enter an email for your receipt.",
  phone: "Enter a phone number the courier can call.",
  address: "Enter a street address.",
  city: "Enter a city or province.",
  country: "Enter a country.",
};
const ORDER: FieldName[] = ["fullName", "email", "phone", "address", "city", "country"];

const Checkout = () => {
  const navigate = useNavigate();
  const { settings } = useStorefrontSettings();

  const [cart, setCart] = useState<CartResponseData | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pricing, setPricing] = useState<CheckoutPreview>(emptyPreview);
  const [isPricing, setIsPricing] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const deferredPromoCode = useDeferredValue(promoCode.trim());
  const [promoMessage, setPromoMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<Form>({ fullName: "", email: "", phone: "", address: "", city: "", country: "Cambodia", paymentMethod: "card" });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedInvoice, setPlacedInvoice] = useState<CustomerInvoice | null>(null);
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const showSkeleton = useSkeletonVisible(!cart && !loadError);

  // Load cart + profile (same calls as the old inline checkout).
  useEffect(() => {
    let active = true;
    Promise.all([customerService.getCart(), customerService.getCurrentProfile()])
      .then(([cartData, profileData]) => {
        if (!active) return;
        setCart(cartData);
        setProfile(profileData);
      })
      .catch(() => active && setLoadError(true));
    return () => { active = false; };
  }, []);

  // Pre-fill from the profile without overwriting anything already typed.
  useEffect(() => {
    if (!profile) return;
    const fullName = `${profile.first_name} ${profile.last_name}`.trim();
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || fullName,
      email: prev.email || profile.email,
      phone: prev.phone || profile.phone || "",
      address: prev.address || profile.address || "",
    }));
  }, [profile]);

  // Server-calculated totals; re-run when the promo code settles.
  const itemCount = cart?.items.length ?? 0;
  useEffect(() => {
    if (!cart || itemCount === 0) return;
    let active = true;
    setIsPricing(true);
    customerService
      .previewCheckout(deferredPromoCode || undefined)
      .then((preview) => {
        if (!active) return;
        setPricing(preview);
        setPromoMessage(preview.promoCode ? { tone: "success", text: `${preview.promoCode} applied.` } : null);
      })
      .catch(async (error: any) => {
        if (!active) return;
        if (deferredPromoCode) {
          setPromoMessage({ tone: "error", text: error?.response?.data?.message || "That code can't be applied." });
          try {
            const fallback = await customerService.previewCheckout();
            if (active) setPricing(fallback);
          } catch {
            if (active) setPricing(emptyPreview);
          }
        } else {
          setPricing(emptyPreview);
          setPromoMessage(null);
        }
      })
      .finally(() => active && setIsPricing(false));
    return () => { active = false; };
  }, [cart, itemCount, deferredPromoCode]);

  const summary = useMemo(() => ({
    subtotal: toNumber(pricing.subtotal),
    discount: toNumber(pricing.discountAmount),
    shipping: toNumber(pricing.shipping),
    tax: toNumber(pricing.tax),
    total: toNumber(pricing.total),
  }), [pricing]);

  const setField = (field: FieldName) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: value.trim() ? "" : REQUIRED[field] }));
  };
  const fieldProps = (field: FieldName) => ({
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => { refs.current[field] = el; },
    value: form[field],
    onChange: setField(field),
    onBlur: () => form[field] === "" || setErrors((prev) => ({ ...prev, [field]: form[field].trim() ? "" : REQUIRED[field] })),
    error: errors[field],
  });

  const handlePlaceOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!cart || cart.items.length === 0) return;

    const nextErrors: Partial<Record<FieldName, string>> = {};
    ORDER.forEach((field) => { nextErrors[field] = form[field].trim() ? "" : REQUIRED[field]; });
    setErrors(nextErrors);
    const firstInvalid = ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) return refs.current[firstInvalid]?.focus();

    const shippingAddress = `${form.address}, ${form.city}, ${form.country}`;
    setIsPlacing(true);
    try {
      const invoice = await customerService.checkout(form.paymentMethod, shippingAddress, promoCode || undefined);
      setCart({ ...cart, items: [], item_count: 0, subtotal: 0 });
      setPricing(emptyPreview);
      setPromoCode("");
      setPromoMessage(null);
      setPlacedInvoice(invoice);
    } catch (error: any) {
      await alertModal.error({
        title: "Your order didn't go through",
        text: error?.response?.data?.message || "Nothing was charged. Check your details and try again.",
      });
    } finally {
      setIsPlacing(false);
    }
  };

  const header = (
    <header className="mb-8 grid gap-3">
      <Breadcrumb items={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]} />
      <h1 className="text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">Checkout</h1>
    </header>
  );

  if (loadError) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        <EmptyState icon={ShoppingBag} title="Checkout didn't load" description="Check your connection and try again." action={<Button onClick={() => window.location.reload()}>Try again</Button>} />
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        {showSkeleton ? (
          <div aria-busy="true" className="grid gap-8 lg:grid-cols-12" >
            <span className="sr-only">Loading checkout…</span>
            <div aria-hidden="true" className="grid gap-4 lg:col-span-7">
              {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-12 rounded-md" />)}
            </div>
            <div aria-hidden="true" className="skeleton h-72 rounded-xl lg:col-span-5" />
          </div>
        ) : null}
      </div>
    );
  }

  if (cart.items.length === 0 && !placedInvoice) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        <EmptyState icon={ShoppingBag} title="Nothing to check out" description="Your cart is empty. Add a book, then come back here." action={<Button asChild><Link to="/browse">Browse books</Link></Button>} />
      </div>
    );
  }

  return (
    <div className="section-wrap py-8 lg:py-12">
      {header}

      <form onSubmit={handlePlaceOrder} noValidate className="grid gap-8 lg:grid-cols-12">
        <div className="grid content-start gap-8 lg:col-span-7">
          <fieldset className="grid gap-5 rounded-xl border border-border bg-card p-6">
            <legend className="sr-only">Delivery details</legend>
            <h2 className="text-[1.563rem] leading-tight text-foreground" aria-hidden="true">Delivery details</h2>
            <TextField label="Full name" autoComplete="name" {...fieldProps("fullName")} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Email" type="email" inputMode="email" autoComplete="email" hint="We'll send the receipt here." {...fieldProps("email")} />
              <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" {...fieldProps("phone")} />
            </div>
            <TextAreaField label="Street address" autoComplete="street-address" className="min-h-20" {...fieldProps("address")} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="City or province" autoComplete="address-level1" {...fieldProps("city")} />
              <TextField label="Country" autoComplete="country-name" {...fieldProps("country")} />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-6">
            <legend className="sr-only">Payment method</legend>
            <h2 className="text-[1.563rem] leading-tight text-foreground" aria-hidden="true">Payment</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { value: "card", label: "Card", note: "Pay now by card", Icon: CreditCard },
                { value: "cod", label: "Cash on delivery", note: "Pay the courier", Icon: Banknote },
              ] as const).map(({ value, label, note, Icon }) => {
                const checked = form.paymentMethod === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-[border-color,background-color,transform] duration-150 active:scale-[0.99] motion-reduce:active:scale-100",
                      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                      checked ? "border-primary bg-lapis-tint" : "border-input hover:bg-secondary",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={value}
                      checked={checked}
                      onChange={() => setForm((prev) => ({ ...prev, paymentMethod: value }))}
                      className="sr-only"
                    />
                    <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", checked ? "border-primary" : "border-input")} aria-hidden="true">
                      {checked ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                    </span>
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="grid">
                      <span className="font-semibold text-foreground">{label}</span>
                      <span className="text-sm text-muted-foreground">{note}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <aside aria-labelledby="order-summary-title" className="lg:col-span-5">
          <div className="grid gap-5 rounded-xl border border-border bg-card p-6 lg:sticky lg:top-28">
            <h2 id="order-summary-title" className="text-[1.563rem] leading-tight text-foreground">Your order</h2>

            <ul className="grid gap-3">
              {cart.items.map((item) => (
                <li key={item.book_id} className="flex items-center gap-3">
                  <div className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                    <BookCoverImage src={item.book_img} alt="" className="h-full w-full object-cover" iconClassName="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">Qty <span className="tabular-nums">{toNumber(item.quantity)}</span></p>
                  </div>
                  <p className="tabular-nums text-foreground">{formatPrice(item.line_total)}</p>
                </li>
              ))}
            </ul>

            <div className="grid gap-2 border-t border-border pt-5">
              <TextField
                label="Promo code"
                optional
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                autoComplete="off"
                error={promoMessage?.tone === "error" ? promoMessage.text : undefined}
                hint={promoMessage?.tone === "success" ? promoMessage.text : "Applied automatically as you type."}
              />
            </div>

            <dl className="grid gap-2 border-t border-border pt-5 text-base" aria-busy={isPricing}>
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatPrice(summary.subtotal)}</dd></div>
              {summary.discount > 0 ? (
                <div className="flex justify-between text-success"><dt>Discount{pricing.promoCode ? ` (${pricing.promoCode})` : ""}</dt><dd className="tabular-nums">−{formatPrice(summary.discount)}</dd></div>
              ) : null}
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="tabular-nums">{summary.shipping === 0 ? "Free" : formatPrice(summary.shipping)}</dd></div>
              {summary.tax > 0 ? <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular-nums">{formatPrice(summary.tax)}</dd></div> : null}
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-semibold text-foreground">Total</dt>
                <dd className="text-2xl font-semibold tabular-nums text-foreground">{formatPrice(summary.total)}</dd>
              </div>
            </dl>

            {Object.values(errors).some(Boolean) ? <FormAlert title="Check the highlighted delivery details." /> : null}

            <CtaGlare block>
              <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isPlacing || isPricing} aria-busy={isPlacing}>
                {isPlacing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                {isPlacing ? "Placing order…" : `Place order · ${formatPrice(summary.total)}`}
              </Button>
            </CtaGlare>
            <Button asChild variant="link" className="justify-center"><Link to="/cart">Back to cart</Link></Button>
          </div>
        </aside>
      </form>

      <Modal isOpen={Boolean(placedInvoice)} onClose={() => setPlacedInvoice(null)} title={placedInvoice ? `Order ${placedInvoice.id}` : "Order"} maxWidthClass="max-w-2xl">
        {placedInvoice ? (
          <div className="grid gap-5">
            <FormAlert tone="success" title="Your order is placed">
              A receipt is on its way to {placedInvoice.customerEmail || form.email}. You can follow it from your orders.
            </FormAlert>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Order", placedInvoice.id],
                ["Date", new Date(placedInvoice.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
                ["Payment", placedInvoice.paymentMethod === "card" ? "Card" : "Cash on delivery"],
                ["Total", formatPrice(placedInvoice.total)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-background p-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => printInvoiceReceipt(placedInvoice, settings)}><Printer aria-hidden="true" />Print receipt</Button>
              <Button variant="outline" onClick={() => { setPlacedInvoice(null); navigate("/browse"); }}>Keep shopping</Button>
              <Button onClick={() => { setPlacedInvoice(null); navigate("/orders"); }}><ReceiptText aria-hidden="true" />View my orders</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Checkout;
