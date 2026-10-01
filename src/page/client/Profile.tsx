import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Loader2, LogOut, ReceiptText, ShoppingBag, UserRound } from "lucide-react";
import authService from "../../services/auth.service";
import customerService from "../../services/customer.service";
import type { CustomerInvoice, CustomerProfile } from "../../types/customer.types";
import { alertToast } from "../../lib/alerts";
import { formatOrderDate, formatPrice, toNumber } from "../../lib/format";
import { useSkeletonVisible } from "../../hooks/useSkeletonVisible";
import CountUp from "../../components/CountUp";
import SpotlightCard from "../../components/SpotlightCard";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/EmptyState";
import { FormAlert } from "../../components/form/FormAlert";
import { TextAreaField, TextField } from "../../components/form/Field";
import { OrderStatusBadge } from "../../components/OrderStatus";

/*
 * /profile: account overview. Same data and behaviour as the old page (profile + orders
 * load, editable details saved via PUT /customers/{id}, completion meter, order/spend
 * summary, recent orders, sign out), rebuilt on MASTER components.
 */

type FieldName = "first_name" | "last_name" | "email" | "phone" | "address";
type Form = Record<FieldName, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OPEN: CustomerInvoice["status"][] = ["pending", "paid", "processing", "shipped"];

const toForm = (p: CustomerProfile): Form => ({
  first_name: p.first_name ?? "",
  last_name: p.last_name ?? "",
  email: p.email ?? "",
  phone: p.phone ?? "",
  address: p.address ?? "",
});

const validate = (field: FieldName, value: string): string => {
  const v = value.trim();
  if (field === "first_name") return v ? "" : "Enter your first name.";
  if (field === "last_name") return v ? "" : "Enter your last name.";
  if (field === "email") return !v ? "Enter your email address." : EMAIL_PATTERN.test(v) ? "" : "Enter an email address like name@example.com.";
  if (field === "phone") return v.length > 25 ? "Use 25 characters or fewer." : "";
  return "";
};
const ORDER: FieldName[] = ["first_name", "last_name", "email", "phone", "address"];

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerInvoice[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<Form>({ first_name: "", last_name: "", email: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const showSkeleton = useSkeletonVisible(!profile && !loadError);

  useEffect(() => {
    let active = true;
    Promise.all([customerService.getCurrentProfile(), customerService.getInvoices()])
      .then(([profileData, orderData]) => {
        if (!active) return;
        setProfile(profileData);
        setForm(toForm(profileData));
        setOrders([...orderData].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      })
      .catch(() => active && setLoadError(true));
    return () => { active = false; };
  }, []);

  const completion = useMemo(() => {
    const filled = ORDER.filter((field) => form[field].trim()).length;
    return Math.round((filled / ORDER.length) * 100);
  }, [form]);

  const metrics = useMemo(() => ({
    open: orders.filter((o) => OPEN.includes(o.status)).length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    spent: orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + toNumber(o.total), 0),
  }), [orders]);

  const isDirty = profile ? ORDER.some((field) => form[field] !== toForm(profile)[field]) : false;

  const fieldProps = (field: FieldName) => ({
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => { refs.current[field] = el; },
    value: form[field],
    onChange: (event: { target: { value: string } }) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
    },
    onBlur: () => setErrors((prev) => ({ ...prev, [field]: validate(field, form[field]) })),
    error: errors[field],
  });

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    const next: Partial<Record<FieldName, string>> = {};
    ORDER.forEach((field) => { next[field] = validate(field, form[field]); });
    setErrors(next);
    setFormError("");
    const firstInvalid = ORDER.find((field) => next[field]);
    if (firstInvalid) return refs.current[firstInvalid]?.focus();

    setIsSaving(true);
    try {
      await customerService.updateCurrentProfile(profile.id, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      const refreshed = await customerService.getCurrentProfile();
      setProfile(refreshed);
      setForm(toForm(refreshed));
      alertToast.success("Details saved", "Your account details are up to date.");
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 409) {
        setErrors((prev) => ({ ...prev, email: "Another account already uses this email." }));
        refs.current.email?.focus();
      } else {
        setFormError(error?.response?.data?.message || "We couldn't save your details. Try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authService.logout();
    alertToast.info("Signed out", "See you next time.");
    navigate("/login", { replace: true });
  };

  const header = (
    <header className="mb-8">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">
        {profile?.first_name ? `Hello, ${profile.first_name}` : "Your account"}
      </h1>
      {profile ? <p className="mt-2 text-muted-foreground">{profile.email}</p> : null}
    </header>
  );

  if (loadError) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        <EmptyState icon={UserRound} title="Your account didn't load" description="Check your connection and try again." action={<Button onClick={() => window.location.reload()}>Try again</Button>} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        {showSkeleton ? (
          <div aria-busy="true" className="grid gap-8 lg:grid-cols-12">
            <span className="sr-only">Loading your account…</span>
            <div aria-hidden="true" className="skeleton h-[26rem] rounded-xl lg:col-span-8" />
            <div aria-hidden="true" className="skeleton h-72 rounded-xl lg:col-span-4" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="section-wrap py-8 lg:py-12">
      {header}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="grid content-start gap-8 lg:col-span-8">
          <section aria-labelledby="details-title" className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="details-title" className="text-[1.563rem] leading-tight text-foreground">Personal details</h2>
              <p className="text-sm text-muted-foreground">Used for delivery and your receipts.</p>
            </div>
            <form onSubmit={handleSave} noValidate className="mt-6 grid gap-5">
              {formError ? <FormAlert title={formError} /> : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="First name" autoComplete="given-name" {...fieldProps("first_name")} />
                <TextField label="Last name" autoComplete="family-name" {...fieldProps("last_name")} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Email" type="email" inputMode="email" autoComplete="email" {...fieldProps("email")} />
                <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" optional {...fieldProps("phone")} />
              </div>
              <TextAreaField label="Delivery address" autoComplete="street-address" optional hint="Pre-filled at checkout." {...fieldProps("address")} />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={!isDirty || isSaving} aria-busy={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
                {isDirty && !isSaving ? (
                  <Button type="button" variant="ghost" onClick={() => { setForm(toForm(profile)); setErrors({}); setFormError(""); }}>
                    Discard changes
                  </Button>
                ) : null}
                <p className="text-sm text-muted-foreground" aria-live="polite">{isDirty ? "You have unsaved changes." : ""}</p>
              </div>
            </form>
          </section>

          <section aria-labelledby="recent-title" className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="recent-title" className="text-[1.563rem] leading-tight text-foreground">Recent orders</h2>
              {orders.length > 0 ? (
                <Link to="/orders" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  All orders <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            {orders.length === 0 ? (
              <EmptyState icon={ReceiptText} headingLevel="h3" title="No orders yet" description="Your orders and their delivery progress will show up here." action={<Button asChild><Link to="/browse">Browse books</Link></Button>} className="py-8" />
            ) : (
              <ul className="mt-4 grid gap-3">
                {orders.slice(0, 3).map((order) => (
                  <li key={order.id}>
                    <SpotlightCard className="group rounded-lg border-border bg-card p-0 transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.995] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100">
                      <Link to={`/orders/${encodeURIComponent(order.id)}`} className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold tabular-nums text-foreground">{order.id}</p>
                          <p className="text-sm text-muted-foreground">{formatOrderDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? "title" : "titles"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <OrderStatusBadge status={order.status} />
                          <span className="font-semibold tabular-nums text-foreground">{formatPrice(order.total)}</span>
                        </div>
                      </Link>
                    </SpotlightCard>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-6 lg:col-span-4">
          <section aria-labelledby="summary-title" className="rounded-xl border border-border bg-card p-6">
            <h2 id="summary-title" className="text-[1.563rem] leading-tight text-foreground">At a glance</h2>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
              {[
                { label: "Orders", value: orders.length },
                { label: "Open", value: metrics.open },
                { label: "Delivered", value: metrics.delivered },
              ].map((stat) => (
                <div key={stat.label} className="bg-card p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 font-display text-[1.75rem] leading-none tabular-nums text-primary"><CountUp to={stat.value} duration={1.2} /></dd>
                </div>
              ))}
              <div className="bg-card p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Spent</dt>
                <dd className="mt-1 font-display text-[1.4rem] leading-none tabular-nums text-primary">{formatPrice(metrics.spent)}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-sm">
                <p id="completion-label" className="font-semibold text-foreground">Profile complete</p>
                <p className="tabular-nums text-muted-foreground">{completion}%</p>
              </div>
              <div role="progressbar" aria-labelledby="completion-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${completion}%` }} />
              </div>
              {completion < 100 ? <p className="mt-2 text-sm text-muted-foreground">Add your phone and address for faster checkout.</p> : null}
            </div>
          </section>

          <nav aria-label="Account shortcuts" className="rounded-xl border border-border bg-card p-2">
            <ul className="grid">
              {[
                { to: "/orders", label: "Orders", Icon: ReceiptText },
                { to: "/favorites", label: "Wishlist", Icon: Heart },
                { to: "/cart", label: "Cart", Icon: ShoppingBag },
              ].map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link to={to} className="group flex min-h-12 items-center gap-3 rounded-lg px-4 font-semibold text-foreground transition-colors duration-150 hover:bg-secondary">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    {label}
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Button variant="outline" onClick={() => void handleSignOut()} disabled={isSigningOut} aria-busy={isSigningOut} className="w-full">
            {isSigningOut ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </aside>
      </div>
    </div>
  );
};

export default Profile;
