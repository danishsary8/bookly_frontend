import { Bell, Save, Shield, Store, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import adminService from "../../services/admin.service";
import authService from "../../services/auth.service";
import type { StoreSettingsPayload } from "../../types/customer.types";

const emptyForm: StoreSettingsPayload = {
  store_name: "",
  support_email: "",
  support_phone: "",
  hero_heading: "",
  hero_subheading: "",
  free_shipping_threshold: 60,
  shipping_fee: 2,
  tax_rate: 0,
  low_stock_threshold: 5,
};

const Settings = () => {
  const [adminEmail, setAdminEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [form, setForm] = useState<StoreSettingsPayload>(emptyForm);

  useEffect(() => {
    const loadSettingsContext = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [user, settings] = await Promise.all([
          authService.getCurrentUser(),
          adminService.getSettings(),
        ]);

        setAdminEmail(user.email);
        setForm({
          store_name: settings.store_name,
          support_email: settings.support_email,
          support_phone: settings.support_phone || "",
          hero_heading: settings.hero_heading,
          hero_subheading: settings.hero_subheading,
          free_shipping_threshold: settings.free_shipping_threshold,
          shipping_fee: settings.shipping_fee,
          tax_rate: settings.tax_rate,
          low_stock_threshold: settings.low_stock_threshold,
        });
        setLastUpdated(settings.updated_at);
      } catch (loadError: any) {
        setError(loadError?.response?.data?.message || "Unable to load store settings.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettingsContext();
  }, []);

  const checkoutPreview = useMemo(() => {
    const exampleSubtotal = 45;
    const shipping = exampleSubtotal >= form.free_shipping_threshold ? 0 : form.shipping_fee;
    return exampleSubtotal + shipping;
  }, [form.free_shipping_threshold, form.shipping_fee]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setError("");
      setMessage("");
      const updated = await adminService.updateSettings({
        ...form,
        support_phone: form.support_phone?.trim() || null,
      });
      setLastUpdated(updated.updated_at);
      setMessage("Store settings saved successfully. Checkout policy now uses these values.");
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || "Unable to save store settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Preferences</p>
          <h1 className="text-3xl font-bold text-slate-900">Store Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Persisted configuration for storefront content, Cambodia shipping, and inventory control.</p>
        </div>
        <button
          type="submit"
          form="store-settings-form"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60"
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-600">
          Loading store settings...
        </div>
      ) : (
        <form id="store-settings-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 grid place-items-center">
                  <Store size={16} />
                </div>
                <h2 className="font-bold text-slate-900">Brand & Content</h2>
              </div>
              <div className="space-y-4 text-sm">
                <label className="block">
                  <span className="text-slate-600">Store Name</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.store_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, store_name: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Hero Heading</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.hero_heading}
                    onChange={(event) => setForm((prev) => ({ ...prev, hero_heading: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Hero Subheading</span>
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.hero_subheading}
                    onChange={(event) => setForm((prev) => ({ ...prev, hero_subheading: event.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 grid place-items-center">
                  <Bell size={16} />
                </div>
                <h2 className="font-bold text-slate-900">Support & Contact</h2>
              </div>
              <div className="space-y-4 text-sm">
                <label className="block">
                  <span className="text-slate-600">Support Email</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.support_email}
                    onChange={(event) => setForm((prev) => ({ ...prev, support_email: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Support Phone</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.support_phone || ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, support_phone: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Authenticated Admin</span>
                  <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none" value={adminEmail} readOnly />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
                  <Truck size={16} />
                </div>
                <h2 className="font-bold text-slate-900">Checkout Policy</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <label className="block">
                  <span className="text-slate-600">Free Shipping Threshold</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.free_shipping_threshold}
                    onChange={(event) => setForm((prev) => ({ ...prev, free_shipping_threshold: Number(event.target.value) }))}
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Shipping Fee</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.shipping_fee}
                    onChange={(event) => setForm((prev) => ({ ...prev, shipping_fee: Number(event.target.value) }))}
                  />
                </label>
                <div className="block">
                  <span className="text-slate-600">Tax Policy</span>
                  <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                    Cambodia storefront: tax disabled
                  </div>
                </div>
                <label className="block">
                  <span className="text-slate-600">Low Stock Threshold</span>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                    value={form.low_stock_threshold}
                    onChange={(event) => setForm((prev) => ({ ...prev, low_stock_threshold: Number(event.target.value) }))}
                  />
                </label>
              </div>
            </div>

            <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 grid place-items-center">
                  <Shield size={16} />
                </div>
                <h2 className="font-bold text-slate-900">Live Preview</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">Homepage Hero</p>
                <p className="mt-3 text-xl font-bold text-slate-900">{form.hero_heading}</p>
                <p className="mt-2 text-sm text-slate-500">{form.hero_subheading}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">Checkout Example</p>
                <p className="mt-3 text-sm text-slate-600">Sample subtotal: $45.00</p>
                <p className="mt-2 text-sm text-slate-600">Shipping: {45 >= form.free_shipping_threshold ? "$0.00" : `$${form.shipping_fee.toFixed(2)}`}</p>
                <p className="mt-3 text-lg font-bold text-slate-900">Preview total: ${checkoutPreview.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">Last Updated</p>
                <p className="mt-2 text-sm text-slate-700">{lastUpdated ? new Date(lastUpdated).toLocaleString() : "Not available"}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60 disabled:opacity-70"
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Store Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Settings;
