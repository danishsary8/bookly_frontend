import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingBag,
  Truck,
  WalletCards,
  XCircle,
} from "lucide-react";
import Modal from "../../components/ui/modal";
import adminService from "../../services/admin.service";
import type { CustomerInvoice } from "../../types/customer.types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const statusToneMap: Record<CustomerInvoice["status"], string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-cyan-100 text-cyan-700 border-cyan-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  shipped: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delivered: "bg-teal-100 text-teal-700 border-teal-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusIconMap = {
  pending: Clock3,
  paid: WalletCards,
  processing: PackageCheck,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
} satisfies Record<CustomerInvoice["status"], ComponentType<{ className?: string }>>;

const statusOrder: Array<CustomerInvoice["status"] | "all"> = [
  "all",
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

interface FulfillmentForm {
  status: CustomerInvoice["status"];
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  estimated_delivery_at: string;
}

const emptyFulfillmentForm: FulfillmentForm = {
  status: "pending",
  carrier: "",
  tracking_number: "",
  tracking_url: "",
  estimated_delivery_at: "",
};

const Orders = () => {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [fulfillmentForm, setFulfillmentForm] = useState<FulfillmentForm>(emptyFulfillmentForm);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOrder)[number]>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setError("");
      const invoiceData = await adminService.getInvoices();
      setInvoices(invoiceData);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Unable to load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  useEffect(() => {
    if (!selectedInvoice) {
      setFulfillmentForm(emptyFulfillmentForm);
      return;
    }

    setFulfillmentForm({
      status: selectedInvoice.status,
      carrier: selectedInvoice.carrier || "",
      tracking_number: selectedInvoice.trackingNumber || "",
      tracking_url: selectedInvoice.trackingUrl || "",
      estimated_delivery_at: selectedInvoice.estimatedDeliveryAt
        ? String(selectedInvoice.estimatedDeliveryAt).slice(0, 16).replace(" ", "T")
        : "",
    });
  }, [selectedInvoice]);

  const applyUpdatedInvoice = (updatedInvoice: CustomerInvoice) => {
    setInvoices((prev) => prev.map((invoice) => (
      invoice.id === updatedInvoice.id ? updatedInvoice : invoice
    )));
    setSelectedInvoice((prev) => (prev?.id === updatedInvoice.id ? updatedInvoice : prev));
  };

  const handleQuickStatusChange = async (invoice: CustomerInvoice, status: CustomerInvoice["status"]) => {
    try {
      setError("");
      setSuccess("");
      const updatedInvoice = await adminService.updateInvoiceStatus(invoice.id, {
        status,
        carrier: invoice.carrier || null,
        tracking_number: invoice.trackingNumber || null,
        tracking_url: invoice.trackingUrl || null,
        estimated_delivery_at: invoice.estimatedDeliveryAt || null,
      });
      applyUpdatedInvoice(updatedInvoice);
      setSuccess(`Order ${invoice.id} updated to ${status}.`);
    } catch (updateError: any) {
      setError(updateError?.response?.data?.message || "Unable to update order status.");
    }
  };

  const handleFulfillmentSave = async () => {
    if (!selectedInvoice) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccess("");
      const updatedInvoice = await adminService.updateInvoiceStatus(selectedInvoice.id, {
        ...fulfillmentForm,
        carrier: fulfillmentForm.carrier.trim() || null,
        tracking_number: fulfillmentForm.tracking_number.trim() || null,
        tracking_url: fulfillmentForm.tracking_url.trim() || null,
        estimated_delivery_at: fulfillmentForm.estimated_delivery_at || null,
      });
      applyUpdatedInvoice(updatedInvoice);
      setSuccess(`Order ${selectedInvoice.id} fulfillment details updated.`);
    } catch (updateError: any) {
      setError(updateError?.response?.data?.message || "Unable to update order fulfillment.");
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(() => {
    const validOrders = invoices.filter((invoice) => invoice.status !== "cancelled");
    const revenue = validOrders.reduce((sum, invoice) => sum + invoice.total, 0);
    const actionRequired = invoices.filter((invoice) => ["pending", "paid", "processing"].includes(invoice.status)).length;

    return {
      totalOrders: invoices.length,
      revenue,
      actionRequired,
      shipped: invoices.filter((invoice) => invoice.status === "shipped").length,
      delivered: invoices.filter((invoice) => invoice.status === "delivered").length,
      cancelled: invoices.filter((invoice) => invoice.status === "cancelled").length,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesStatus = statusFilter === "all" ? true : invoice.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        invoice.id,
        invoice.customerName,
        invoice.customerEmail,
        invoice.shippingAddress,
        invoice.carrier || "",
        invoice.trackingNumber || "",
        ...invoice.items.map((item) => item.title),
      ].join(" ").toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [invoices, query, statusFilter]);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Order Control</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Fulfillment Workspace</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Review invoices, capture shipment details, and move orders through a fuller real-world fulfillment flow.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Action Required</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.actionRequired}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Shipped</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.shipped}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Delivered</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.delivered}</p>
            </div>
          </div>
        </div>
      </section>

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

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Orders</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{summary.totalOrders}</p>
          <p className="mt-2 text-sm text-slate-500">All recorded customer invoices.</p>
        </article>

        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <WalletCards className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Revenue</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{currencyFormatter.format(summary.revenue)}</p>
          <p className="mt-2 text-sm text-slate-500">Excludes cancelled orders.</p>
        </article>

        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <Truck className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">In Transit</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{summary.shipped}</p>
          <p className="mt-2 text-sm text-slate-500">Orders currently on the road.</p>
        </article>

        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Delivered</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{summary.delivered}</p>
          <p className="mt-2 text-sm text-slate-500">Orders completed successfully.</p>
        </article>
      </section>

      <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Filters</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Order Directory</h2>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by invoice, customer, tracking, or title"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-200/30"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {statusOrder.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                    statusFilter === status
                      ? "border-orange-200 bg-orange-500 text-white shadow-lg shadow-orange-200/50"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm font-semibold text-slate-600">
              Loading orders...
            </div>
          ) : (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-2 py-3">Invoice</th>
                  <th className="px-2 py-3">Customer</th>
                  <th className="px-2 py-3">Shipment</th>
                  <th className="px-2 py-3">Total</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Quick Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length ? filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-left"
                      >
                        <p className="font-bold text-slate-900">{invoice.id}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(invoice.createdAt).toLocaleString()}</p>
                      </button>
                    </td>
                    <td className="px-2 py-4">
                      <p className="font-semibold text-slate-900">{invoice.customerName}</p>
                      <p className="mt-1 text-xs text-slate-500">{invoice.customerEmail}</p>
                    </td>
                    <td className="px-2 py-4">
                      <p className="font-semibold text-slate-900">{invoice.carrier || "Not assigned"}</p>
                      <p className="mt-1 text-xs text-slate-500">{invoice.trackingNumber || "No tracking number"}</p>
                    </td>
                    <td className="px-2 py-4 font-bold text-slate-900">{currencyFormatter.format(invoice.total)}</td>
                    <td className="px-2 py-4">
                      <span className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase ${statusToneMap[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-2 py-4">
                      <select
                        value={invoice.status}
                        onChange={(event) => void handleQuickStatusChange(invoice, event.target.value as CustomerInvoice["status"])}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40"
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="delivered">delivered</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-2 py-10">
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
                        <ReceiptText className="h-10 w-10 text-slate-300" />
                        <p className="mt-4 text-lg font-bold text-slate-900">No orders match the current filter</p>
                        <p className="mt-2 text-sm text-slate-500">Try another status or search term.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice ? `Order ${selectedInvoice.id}` : "Order"}
        maxWidthClass="max-w-5xl"
      >
        {selectedInvoice && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Customer</p>
                <p className="mt-2 text-base font-bold text-slate-900">{selectedInvoice.customerName}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedInvoice.customerEmail}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Placed</p>
                <p className="mt-2 text-base font-bold text-slate-900">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                <p className="mt-1 text-sm text-slate-500">{new Date(selectedInvoice.createdAt).toLocaleTimeString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Payment</p>
                <p className="mt-2 text-base font-bold text-slate-900">{selectedInvoice.paymentMethod === "card" ? "Card" : "Cash on delivery"}</p>
                {selectedInvoice.promoCode ? (
                  <p className="mt-1 text-xs text-slate-500">{selectedInvoice.promoCode} saved ${selectedInvoice.discountAmount.toFixed(2)}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Status</p>
                <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${statusToneMap[selectedInvoice.status]}`}>
                  {(() => {
                    const Icon = statusIconMap[selectedInvoice.status];
                    return <Icon className="h-3.5 w-3.5" />;
                  })()}
                  {selectedInvoice.status}
                </div>
                {selectedInvoice.deliveredAt ? (
                  <p className="mt-2 text-xs text-slate-500">Delivered {new Date(selectedInvoice.deliveredAt).toLocaleString()}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[1.4fr_0.55fr_0.7fr] border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  <span>Book</span>
                  <span>Quantity</span>
                  <span>Total</span>
                </div>
                {selectedInvoice.items.map((item) => (
                  <div key={`${selectedInvoice.id}-${item.id}`} className="grid grid-cols-[1.4fr_0.55fr_0.7fr] px-4 py-3 text-sm text-slate-700 border-b border-slate-100 last:border-b-0">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">by {item.author_name}</p>
                    </div>
                    <span>{item.quantity}</span>
                    <span className="font-semibold text-slate-900">{currencyFormatter.format(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{currencyFormatter.format(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 ? (
                    <div className="mt-2 flex items-center justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{currencyFormatter.format(selectedInvoice.discountAmount)}</span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between text-slate-600">
                    <span>Shipping</span>
                    <span>{currencyFormatter.format(selectedInvoice.shipping)}</span>
                  </div>
                  {selectedInvoice.tax > 0 ? (
                    <div className="mt-2 flex items-center justify-between text-slate-600">
                      <span>Tax</span>
                      <span>{currencyFormatter.format(selectedInvoice.tax)}</span>
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                    <span>Total</span>
                    <span>{currencyFormatter.format(selectedInvoice.total)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Shipping Address</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{selectedInvoice.shippingAddress}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Fulfillment Details</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">Shipment & Delivery</h3>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  value={fulfillmentForm.status}
                  onChange={(event) => setFulfillmentForm((prev) => ({ ...prev, status: event.target.value as CustomerInvoice["status"] }))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40"
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
                <input
                  value={fulfillmentForm.carrier}
                  onChange={(event) => setFulfillmentForm((prev) => ({ ...prev, carrier: event.target.value }))}
                  placeholder="Carrier"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40"
                />
                <input
                  value={fulfillmentForm.tracking_number}
                  onChange={(event) => setFulfillmentForm((prev) => ({ ...prev, tracking_number: event.target.value }))}
                  placeholder="Tracking number"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40"
                />
                <input
                  value={fulfillmentForm.tracking_url}
                  onChange={(event) => setFulfillmentForm((prev) => ({ ...prev, tracking_url: event.target.value }))}
                  placeholder="Tracking URL"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40"
                />
                <input
                  type="datetime-local"
                  value={fulfillmentForm.estimated_delivery_at}
                  onChange={(event) => setFulfillmentForm((prev) => ({ ...prev, estimated_delivery_at: event.target.value }))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40 md:col-span-2"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Save the shipment data here so customers can see accurate tracking and delivery progress.
                </p>
                <button
                  type="button"
                  onClick={() => void handleFulfillmentSave()}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-sm font-semibold text-white shadow-lg shadow-orange-200/60 disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Fulfillment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
