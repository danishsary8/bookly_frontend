import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import authService from "../../services/auth.service";
import customerService from "../../services/customer.service";
import { getAccessToken } from "../../lib/session";
import type { CustomerInvoice, CustomerProfile } from "../../types/customer.types";
import { alertToast } from "../../lib/alerts";

const fieldClassName =
  "h-12 w-full rounded-2xl border border-border/60 bg-background/80 px-4 pl-11 text-sm text-foreground placeholder:text-foreground/45 outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const [profileData, invoiceData] = await Promise.all([
          customerService.getCurrentProfile(),
          customerService.getInvoices(),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(profileData);
        setInvoices(invoiceData);
        setForm({
          first_name: profileData.first_name ?? "",
          last_name: profileData.last_name ?? "",
          email: profileData.email ?? "",
          phone: profileData.phone ?? "",
          address: profileData.address ?? "",
        });
      } catch (error: any) {
        if (isMounted) {
          setErrorMessage(error?.response?.data?.message || "Unable to load profile.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileCompletion = useMemo(() => {
    const fields = [form.first_name, form.last_name, form.email, form.phone, form.address];
    const completed = fields.filter((value) => Boolean(value?.trim())).length;
    return Math.round((completed / fields.length) * 100);
  }, [form]);

  const metrics = useMemo(() => {
    const delivered = invoices.filter((invoice) => invoice.status === "delivered").length;
    const openOrders = invoices.filter((invoice) => ["pending", "paid", "processing", "shipped"].includes(invoice.status)).length;
    const totalSpent = invoices
      .filter((invoice) => invoice.status !== "cancelled")
      .reduce((sum, invoice) => sum + invoice.total, 0);

    return {
      delivered,
      openOrders,
      totalSpent,
    };
  }, [invoices]);

  const recentInvoices = useMemo(() => invoices.slice(0, 3), [invoices]);

  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="section-wrap py-10">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm font-semibold text-primary">
          Loading your account hub...
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await customerService.updateCurrentProfile(profile.id, form);
      const refreshedProfile = await customerService.getCurrentProfile();
      setProfile(refreshedProfile);
      alertToast.success("Profile updated", "Your account details were saved successfully.");
    } catch (error: any) {
      alertToast.error("Failed to update profile", error?.response?.data?.message || "Please try again.");
    }
  };

  const handleSignOut = async () => {
    await authService.logout();
    navigate("/login");
  };

  return (
    <div className="w-full">
      <main className="section-wrap space-y-6 py-6 lg:py-10">
        <section className="relative overflow-hidden rounded-[30px] border border-border/50 bg-card/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.10),transparent_22%)]" />
          <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Customer Hub</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/68">
                Manage your profile, review order history, open invoices, and keep checkout details accurate from one clean account workspace.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/invoices"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-primary to-emerald-700 px-5 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.20)] transition-all duration-150 hover:-translate-y-0.5"
                >
                  <ReceiptText className="h-4 w-4" />
                  Open Invoice Center
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById("profile-edit-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border/50 bg-background/70 px-5 text-sm font-semibold text-foreground/75 transition-all duration-150 hover:bg-background hover:text-foreground"
                >
                  <Save className="h-4 w-4" />
                  Update Details
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-3xl border border-border/50 bg-background/70 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Invoices</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{invoices.length}</p>
                <p className="mt-1 text-sm text-foreground/58">Total order records in your account.</p>
              </div>
              <div className="rounded-3xl border border-border/50 bg-background/70 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Completion</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <p className="text-3xl font-bold text-foreground">{profileCompletion}%</p>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/50">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>
              <div className="rounded-3xl border border-border/50 bg-background/70 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Spent</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{formatMoney(metrics.totalSpent)}</p>
                <p className="mt-1 text-sm text-foreground/58">Across all active customer orders.</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-4 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-border/50 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground shadow-[0_16px_32px_rgba(16,185,129,0.24)]">
                  <UserRound className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{profile.first_name} {profile.last_name}</p>
                  <p className="text-sm text-foreground/58">{profile.email}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Contact</p>
                  <div className="mt-3 space-y-2 text-sm text-foreground/72">
                    <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-foreground/45" /> {profile.email}</p>
                    <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-foreground/45" /> {profile.phone || "Phone not set"}</p>
                    <p className="inline-flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-foreground/45" /> <span>{profile.address || "Address not set"}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Open Orders</p>
                    <p className="mt-3 text-2xl font-bold text-foreground">{metrics.openOrders}</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Delivered</p>
                    <p className="mt-3 text-2xl font-bold text-foreground">{metrics.delivered}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-border/50 bg-background/65 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Account quality</p>
                      <p className="mt-1 text-sm leading-6 text-foreground/62">
                        Complete your phone and address to make shipping updates and invoice records more reliable.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-rose-200/70 bg-rose-50/80 p-5 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <p className="text-sm font-bold text-rose-900 dark:text-rose-100">Session actions</p>
                  <p className="mt-1 text-sm leading-6 text-rose-800/80 dark:text-rose-100/75">
                    Sign out here when you are done using this device.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition-all duration-150 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-950/30 dark:text-rose-100 dark:hover:bg-rose-950/50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-border/50 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Invoice Access</p>
                  <h2 className="mt-2 text-2xl font-bold text-foreground">Recent invoice activity</h2>
                </div>
                <Link
                  to="/invoices"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border/50 bg-background/70 px-4 text-sm font-semibold text-foreground/75 transition-all duration-150 hover:bg-background hover:text-foreground"
                >
                  Open invoice center
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {recentInvoices.length ? recentInvoices.map((invoice) => (
                  <article key={invoice.id} className="rounded-3xl border border-border/50 bg-background/65 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Invoice</p>
                        <p className="mt-2 text-lg font-bold text-foreground">{invoice.id}</p>
                      </div>
                      <span className="rounded-full border border-border/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/68">
                        {invoice.status}
                      </span>
                    </div>
                    <p className="mt-4 text-sm text-foreground/60">{new Date(invoice.createdAt).toLocaleString()}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-foreground/62">
                        {invoice.status === "delivered" ? <PackageCheck className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                        {invoice.items.length} items
                      </span>
                      <span className="font-bold text-foreground">{formatMoney(invoice.total)}</span>
                    </div>
                  </article>
                )) : (
                  <div className="rounded-3xl border border-dashed border-border/50 bg-background/65 p-6 text-sm text-foreground/60 lg:col-span-3">
                    No invoices yet. Once you place an order, your customer invoice center will appear here.
                  </div>
                )}
              </div>
            </section>

            <form id="profile-edit-form" onSubmit={handleSave} className="rounded-[28px] border border-border/50 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Profile Details</p>
                  <h2 className="mt-2 text-2xl font-bold text-foreground">Update your account information</h2>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-2 text-sm font-semibold text-foreground/68">
                  {profileCompletion}% complete
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">First Name</label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
                    <input
                      value={form.first_name}
                      onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                      className={fieldClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Last Name</label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
                    <input
                      value={form.last_name}
                      onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                      className={fieldClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
                    <input
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      className={fieldClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Phone</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
                    <input
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                      className={fieldClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/52">Address</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-foreground/38" />
                  <textarea
                    value={form.address}
                    onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                    className="min-h-[110px] w-full rounded-2xl border border-border/60 bg-background/80 px-4 pb-4 pl-11 pt-3 text-sm text-foreground outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-between gap-3">
                <p className="max-w-xl text-sm leading-7 text-foreground/60">
                  Keeping this information current makes checkout, delivery updates, and invoice history cleaner.
                </p>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-primary to-emerald-700 px-5 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.20)] transition-all duration-150 hover:-translate-y-0.5"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Profile;
