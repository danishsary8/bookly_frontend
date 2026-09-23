import { BadgePercent, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import Modal from "../../components/ui/modal";
import adminService from "../../services/admin.service";
import type { Promotion, PromotionPayload } from "../../types/customer.types";

const emptyForm: PromotionPayload = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  min_subtotal: 0,
  starts_at: null,
  ends_at: null,
  is_active: true,
};

const Promotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<PromotionPayload>(emptyForm);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadPromotions = async () => {
    try {
      setIsLoading(true);
      setError("");
      setPromotions(await adminService.getPromotions());
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Unable to load promotions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPromotions();
  }, []);

  const openCreate = () => {
    setEditingPromotion(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setForm({
      code: promotion.code,
      description: promotion.description || "",
      discount_type: promotion.discount_type,
      discount_value: Number(promotion.discount_value),
      min_subtotal: Number(promotion.min_subtotal),
      starts_at: promotion.starts_at ? String(promotion.starts_at).slice(0, 16).replace(" ", "T") : null,
      ends_at: promotion.ends_at ? String(promotion.ends_at).slice(0, 16).replace(" ", "T") : null,
      is_active: promotion.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setError("");
      setSuccess("");
      const payload: PromotionPayload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        description: form.description?.trim() || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };

      if (editingPromotion) {
        await adminService.updatePromotion(editingPromotion.id, payload);
        setSuccess(`Promotion ${payload.code} updated.`);
      } else {
        await adminService.createPromotion(payload);
        setSuccess(`Promotion ${payload.code} created.`);
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      setEditingPromotion(null);
      await loadPromotions();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || "Unable to save promotion.");
    }
  };

  const handleDelete = async (promotion: Promotion) => {
    try {
      setError("");
      setSuccess("");
      await adminService.deletePromotion(promotion.id);
      setSuccess(`Promotion ${promotion.code} deleted.`);
      await loadPromotions();
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.message || "Unable to delete promotion.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Commercial Rules</p>
          <h1 className="text-3xl font-bold text-slate-900">Promotions</h1>
          <p className="text-sm text-slate-500 mt-1">Create, activate, and retire discount codes used in checkout.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60"
        >
          <Plus size={16} />
          Add Promotion
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-600">
          Loading promotions...
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {promotions.map((promotion) => (
            <article key={promotion.id} className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
                    <BadgePercent className="h-3.5 w-3.5" />
                    {promotion.code}
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-slate-900">
                    {promotion.discount_type === "percent" ? `${promotion.discount_value}% off` : `$${Number(promotion.discount_value).toFixed(2)} off`}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">{promotion.description || "No description provided."}</p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase ${promotion.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {promotion.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-bold">Minimum subtotal</p>
                  <p className="mt-2 font-semibold text-slate-900">${Number(promotion.min_subtotal).toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-bold">Schedule</p>
                  <p className="mt-2 font-semibold text-slate-900">{promotion.starts_at ? "Scheduled" : "Always on"}</p>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <p>Starts: {promotion.starts_at ? new Date(promotion.starts_at).toLocaleString() : "Immediately"}</p>
                <p>Ends: {promotion.ends_at ? new Date(promotion.ends_at).toLocaleString() : "No expiry"}</p>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEdit(promotion)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => void handleDelete(promotion)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPromotion ? "Edit Promotion" : "Create Promotion"}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              placeholder="Code"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <select
              value={form.discount_type}
              onChange={(event) => setForm((prev) => ({ ...prev, discount_type: event.target.value as PromotionPayload["discount_type"] }))}
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discount_value}
              onChange={(event) => setForm((prev) => ({ ...prev, discount_value: Number(event.target.value) }))}
              placeholder="Discount value"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.min_subtotal}
              onChange={(event) => setForm((prev) => ({ ...prev, min_subtotal: Number(event.target.value) }))}
              placeholder="Minimum subtotal"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <input
              type="datetime-local"
              value={form.starts_at || ""}
              onChange={(event) => setForm((prev) => ({ ...prev, starts_at: event.target.value || null }))}
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <input
              type="datetime-local"
              value={form.ends_at || ""}
              onChange={(event) => setForm((prev) => ({ ...prev, ends_at: event.target.value || null }))}
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <textarea
            value={form.description || ""}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />

          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            Active promotion
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60"
            >
              {editingPromotion ? "Save Changes" : "Create Promotion"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Promotions;
