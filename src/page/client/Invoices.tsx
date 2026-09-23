import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PackageCheck,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Tag,
  Truck,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import Modal from "../../components/ui/modal";
import customerService from "../../services/customer.service";
import { getAccessToken } from "../../lib/session";
import { useStorefrontSettings } from "../../contexts/StorefrontSettingsContext";
import { printInvoiceReceipt } from "../../lib/receipt";
import type { CustomerInvoice, InvoiceItem, ReturnRequest } from "../../types/customer.types";

const statusStepOrder: CustomerInvoice["status"][] = ["pending", "paid", "processing", "shipped", "delivered"];
const invoiceFilters = ["all", "open", "delivered", "cancelled"] as const;
type InvoiceFilter = (typeof invoiceFilters)[number];

const statusIconMap = {
  pending: Clock3,
  paid: WalletCards,
  processing: PackageCheck,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
} satisfies Record<CustomerInvoice["status"], ComponentType<{ className?: string }>>;

const statusToneMap: Record<CustomerInvoice["status"], string> = {
  pending: "border-amber-200/70 bg-amber-100/70 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
  paid: "border-emerald-200/70 bg-emerald-100/70 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
  processing: "border-sky-200/70 bg-sky-100/70 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
  shipped: "border-indigo-200/70 bg-indigo-100/70 text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-100",
  delivered: "border-primary/20 bg-primary/10 text-primary",
  cancelled: "border-rose-200/70 bg-rose-100/70 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
};

const returnStatusToneMap: Record<ReturnRequest["status"], string> = {
  requested: "border-amber-200/70 bg-amber-100/70 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
  approved: "border-sky-200/70 bg-sky-100/70 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
  received: "border-violet-200/70 bg-violet-100/70 text-violet-800 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-100",
  refunded: "border-emerald-200/70 bg-emerald-100/70 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
  rejected: "border-rose-200/70 bg-rose-100/70 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;
const formatDate = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : "Pending");

const Invoices = () => {
  const { settings } = useStorefrontSettings();
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [activeFilter, setActiveFilter] = useState<InvoiceFilter>("all");
  const [search, setSearch] = useState("");
  const [returnItemId, setReturnItemId] = useState<number | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("");
  const [returnMessage, setReturnMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [error, setError] = useState("");

  const loadInvoices = async (selectedInvoiceId?: string | null) => {
    try {
      setIsLoading(true);
      setError("");
      const invoiceData = await customerService.getInvoices();
      setInvoices(invoiceData);

      if (selectedInvoiceId) {
        const nextSelected = invoiceData.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
        setSelectedInvoice(nextSelected);
      }
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Unable to load invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  useEffect(() => {
    if (!selectedInvoice) {
      setReturnItemId(null);
      setReturnQuantity(1);
      setReturnReason("");
      setReturnMessage("");
      return;
    }

    const firstReturnableItem = selectedInvoice.items.find((item) => getRemainingReturnableQuantity(selectedInvoice, item) > 0);
    setReturnItemId(firstReturnableItem?.id ?? null);
    setReturnQuantity(1);
    setReturnReason("");
    setReturnMessage("");
  }, [selectedInvoice]);

  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  const summary = useMemo(() => {
    const validInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
    return {
      totalOrders: invoices.length,
      totalSpent: validInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
      openOrders: invoices.filter((invoice) => ["pending", "paid", "processing", "shipped"].includes(invoice.status)).length,
      deliveredOrders: invoices.filter((invoice) => invoice.status === "delivered").length,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "open"
            ? ["pending", "paid", "processing", "shipped"].includes(invoice.status)
            : invoice.status === activeFilter;

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        invoice.id.toLowerCase().includes(query) ||
        invoice.items.some((item) => item.title.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, invoices, search]);

  function getReservedReturnQuantity(invoice: CustomerInvoice, invoiceItemId: number): number {
    return invoice.returnRequests
      .filter((request) => request.invoiceItemId === invoiceItemId && request.status !== "rejected")
      .reduce((sum, request) => sum + request.quantity, 0);
  }

  function getRemainingReturnableQuantity(invoice: CustomerInvoice, item: InvoiceItem): number {
    return Math.max(0, item.quantity - getReservedReturnQuantity(invoice, item.id));
  }

  const selectedReturnItem = selectedInvoice?.items.find((item) => item.id === returnItemId) ?? null;
  const selectedReturnItemAvailableQty = selectedInvoice && selectedReturnItem
    ? getRemainingReturnableQuantity(selectedInvoice, selectedReturnItem)
    : 0;

  const handleSubmitReturn = async () => {
    if (!selectedInvoice || !returnItemId) {
      setReturnMessage("Please select an item to return.");
      return;
    }

    if (!returnReason.trim()) {
      setReturnMessage("Please provide a reason for the return request.");
      return;
    }

    if (returnQuantity <= 0 || returnQuantity > selectedReturnItemAvailableQty) {
      setReturnMessage("The selected return quantity is not valid.");
      return;
    }

    try {
      setIsSubmittingReturn(true);
      setReturnMessage("");
      await customerService.createReturnRequest(selectedInvoice.id, {
        invoice_item_id: returnItemId,
        quantity: returnQuantity,
        reason: returnReason.trim(),
      });
      await loadInvoices(selectedInvoice.id);
      setReturnMessage("Your return request has been submitted.");
      setReturnReason("");
      setReturnQuantity(1);
    } catch (submitError: any) {
      setReturnMessage(submitError?.response?.data?.message || "Unable to submit return request.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const renderTrackingTimeline = (invoice: CustomerInvoice) => {
    if (invoice.status === "cancelled") {
      const CancelledIcon = statusIconMap.cancelled;
      return (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5">
          <div className="flex items-start gap-3 text-destructive">
            <div className="rounded-2xl bg-destructive/10 p-2.5">
              <CancelledIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Order cancelled</p>
              <p className="mt-1 text-sm leading-6 text-destructive/80">
                This invoice is no longer active and the inventory has already been restored.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const currentIndex = statusStepOrder.indexOf(invoice.status);

    return (
      <div className="grid gap-3 md:grid-cols-5">
        {statusStepOrder.map((step, index) => {
          const Icon = statusIconMap[step];
          const isActive = currentIndex >= index;

          return (
            <div
              key={`${invoice.id}-${step}`}
              className={`rounded-3xl border p-4 ${
                isActive ? "border-primary/25 bg-primary/8" : "border-border/50 bg-background/55"
              }`}
            >
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${
                isActive ? "bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(16,185,129,0.18)]" : "bg-card text-foreground/45"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className={`mt-4 text-xs font-bold uppercase tracking-[0.14em] ${isActive ? "text-foreground" : "text-foreground/45"}`}>
                {step}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/58">
                {step === "pending" && "Order placed and waiting for confirmation."}
                {step === "paid" && "Payment has been approved for your order."}
                {step === "processing" && "Your books are being prepared for shipment."}
                {step === "shipped" && "Your order is on the way with delivery tracking."}
                {step === "delivered" && "The order has arrived successfully."}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      <main className="section-wrap space-y-6 py-6 lg:py-10">
        <section className="relative overflow-hidden rounded-[30px] border border-border/50 bg-card/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.10),transparent_20%)]" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Invoice Center</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Order history and receipts</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/68">
              Review purchases, print receipts, follow delivery progress, and submit return requests from one cleaner invoice workspace.
            </p>
          </div>
        </section>

        {!isLoading && !error && invoices.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Orders</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{summary.totalOrders}</p>
            </div>
            <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Spent</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{formatMoney(summary.totalSpent)}</p>
            </div>
            <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Open</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{summary.openOrders}</p>
            </div>
            <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Delivered</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{summary.deliveredOrders}</p>
            </div>
          </section>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm font-semibold text-primary">Loading invoices...</div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-4 text-sm font-medium text-destructive">{error}</div>
        ) : invoices.length === 0 ? (
          <section className="rounded-[30px] border border-dashed border-border/50 bg-background/50 p-10 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-foreground/40" />
            <h2 className="mt-4 text-2xl font-bold text-foreground">No invoices yet</h2>
            <p className="mt-2 text-foreground/70">Place an order from your cart and your invoice history will appear here.</p>
            <Link
              to="/browse"
              className="mt-5 inline-flex h-11 items-center rounded-2xl bg-gradient-to-r from-primary via-primary to-emerald-700 px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.20)] transition-all duration-150 hover:-translate-y-0.5"
            >
              Browse Books
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-[28px] border border-border/50 bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {invoiceFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize transition-all duration-150 ${
                        activeFilter === filter
                          ? "bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(16,185,129,0.18)]"
                          : "border border-border/50 bg-background/65 text-foreground/68 hover:bg-background hover:text-foreground"
                      }`}
                    >
                      {filter === "all" ? "All orders" : filter}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search invoice id or book title"
                    className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-4 pl-11 text-sm text-foreground placeholder:text-foreground/45 outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              {filteredInvoices.map((invoice) => {
                const StatusIcon = statusIconMap[invoice.status];

                return (
                  <article key={invoice.id} className="rounded-[28px] border border-border/50 bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Invoice</p>
                        <h2 className="mt-2 text-2xl font-bold text-foreground">{invoice.id}</h2>
                        <p className="mt-2 text-sm text-foreground/58">{formatDate(invoice.createdAt)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${statusToneMap[invoice.status]}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {invoice.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Items</p>
                        <p className="mt-2 text-xl font-bold text-foreground">{invoice.items.length}</p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Payment</p>
                        <p className="mt-2 text-sm font-bold text-foreground">{invoice.paymentMethod === "card" ? "Card" : "Cash"}</p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/65 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Total</p>
                        <p className="mt-2 text-xl font-bold text-foreground">{formatMoney(invoice.total)}</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2 rounded-3xl border border-border/50 bg-background/55 p-4">
                      {invoice.items.slice(0, 2).map((item) => (
                        <div key={`${invoice.id}-${item.id}`} className="flex items-start justify-between gap-3 text-sm">
                          <div>
                            <p className="font-semibold text-foreground">{item.title}</p>
                            <p className="mt-1 text-foreground/58">by {item.author_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">x{item.quantity}</p>
                            <p className="mt-1 text-foreground/58">{formatMoney(Number(item.total))}</p>
                          </div>
                        </div>
                      ))}
                      {invoice.items.length > 2 ? (
                        <p className="text-sm font-medium text-foreground/58">+ {invoice.items.length - 2} more item(s)</p>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-foreground/62">
                      {invoice.carrier ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-2">
                          <Truck className="h-4 w-4" />
                          {invoice.carrier}{invoice.trackingNumber ? ` • ${invoice.trackingNumber}` : ""}
                        </span>
                      ) : null}
                      {invoice.promoCode ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-2">
                          <Tag className="h-4 w-4" />
                          {invoice.promoCode}
                        </span>
                      ) : null}
                      {invoice.returnRequests.length ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-2">
                          <RotateCcw className="h-4 w-4" />
                          {invoice.returnRequests.length} return request(s)
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="inline-flex h-11 items-center rounded-2xl border border-border/50 bg-background/70 px-5 text-sm font-semibold text-foreground/75 transition-all duration-150 hover:bg-background hover:text-foreground"
                      >
                        View invoice
                      </button>
                      <button
                        onClick={() => printInvoiceReceipt(invoice, settings)}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-primary to-emerald-700 px-5 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.18)] transition-all duration-150 hover:-translate-y-0.5"
                      >
                        <Printer className="h-4 w-4" />
                        Print receipt
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            {filteredInvoices.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border/50 bg-background/50 p-8 text-center text-sm text-foreground/60">
                No invoices match your current filter or search.
              </div>
            ) : null}
          </>
        )}
      </main>

      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice ? `Invoice ${selectedInvoice.id}` : "Invoice"}
        maxWidthClass="max-w-6xl"
        bodyClassName="max-h-[84vh] overflow-y-auto bg-card/95 p-5 sm:p-6"
      >
        {selectedInvoice ? (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-border/50 bg-background/65 p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.10),transparent_18%)]" />
              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Invoice Details</p>
                  <h3 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{selectedInvoice.id}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/65">
                    Payment details, shipping progress, receipt totals, and returns for this order are all managed here.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${statusToneMap[selectedInvoice.status]}`}>
                    {(() => {
                      const StatusIcon = statusIconMap[selectedInvoice.status];
                      return <StatusIcon className="h-4 w-4" />;
                    })()}
                    {selectedInvoice.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => printInvoiceReceipt(selectedInvoice, settings)}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-primary to-emerald-700 px-5 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.18)] transition-all duration-150 hover:-translate-y-0.5"
                  >
                    <Printer className="h-4 w-4" />
                    Print receipt
                  </button>
                </div>
              </div>

              <div className="relative mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-border/50 bg-card/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Customer</p>
                  <p className="mt-3 text-base font-bold text-foreground">{selectedInvoice.customerName}</p>
                  <p className="mt-1 text-sm text-foreground/58">{selectedInvoice.customerEmail}</p>
                </div>
                <div className="rounded-3xl border border-border/50 bg-card/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Order Date</p>
                  <p className="mt-3 text-base font-bold text-foreground">{formatDate(selectedInvoice.createdAt)}</p>
                </div>
                <div className="rounded-3xl border border-border/50 bg-card/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Payment</p>
                  <p className="mt-3 text-base font-bold text-foreground">{selectedInvoice.paymentMethod === "card" ? "Card payment" : "Cash on delivery"}</p>
                </div>
                <div className="rounded-3xl border border-border/50 bg-card/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Shipping Address</p>
                  <p className="mt-3 text-sm leading-6 text-foreground">{selectedInvoice.shippingAddress}</p>
                </div>
              </div>
            </section>

            {selectedInvoice.promoCode ? (
              <div className="rounded-3xl border border-success/20 bg-success/5 p-5 text-sm text-success">
                Promotion <span className="font-bold">{selectedInvoice.promoCode}</span> applied. Discount saved:{" "}
                <span className="font-bold">{formatMoney(selectedInvoice.discountAmount)}</span>
              </div>
            ) : null}

            <section>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-foreground/50">Tracking Timeline</p>
              {renderTrackingTimeline(selectedInvoice)}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-border/50 bg-background/55 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Purchased Books</p>
                      <h4 className="mt-2 text-xl font-bold text-foreground">Line items</h4>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card px-4 py-2 text-sm font-semibold text-foreground/68">
                      {selectedInvoice.items.length} item(s)
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedInvoice.items.map((item) => {
                      const remainingQty = getRemainingReturnableQuantity(selectedInvoice, item);

                      return (
                        <div key={`${selectedInvoice.id}-${item.id}`} className="rounded-3xl border border-border/50 bg-card p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-base font-bold text-foreground">{item.title}</p>
                              <p className="mt-1 text-sm text-foreground/58">by {item.author_name}</p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="text-sm font-semibold text-foreground">x{item.quantity}</p>
                              <p className="mt-1 text-base font-bold text-foreground">{formatMoney(Number(item.total))}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-foreground/60">
                            <span className="rounded-full border border-border/50 bg-background/60 px-3 py-1.5">
                              Unit price {formatMoney(Number(item.price))}
                            </span>
                            <span className={`rounded-full border px-3 py-1.5 font-semibold ${
                              remainingQty > 0
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                                : "border-border/50 bg-background/60 text-foreground/52"
                            }`}>
                              Returnable {remainingQty}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-[28px] border border-border/50 bg-background/55 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Returns</p>
                      <h4 className="mt-2 text-xl font-bold text-foreground">Return requests</h4>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card px-4 py-2 text-sm font-semibold text-foreground/68">
                      {selectedInvoice.returnRequests.length} request(s)
                    </div>
                  </div>

                  {selectedInvoice.returnRequests.length ? (
                    <div className="mt-5 space-y-3">
                      {selectedInvoice.returnRequests.map((request) => (
                        <article key={request.id} className="rounded-3xl border border-border/50 bg-card p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{request.bookTitle}</p>
                              <p className="mt-1 text-sm text-foreground/60">Qty {request.quantity} • Refund {formatMoney(request.refundAmount)}</p>
                              <p className="mt-2 text-sm leading-6 text-foreground/68">{request.reason}</p>
                              {request.adminNote ? <p className="mt-2 text-sm text-foreground/58">Admin note: {request.adminNote}</p> : null}
                            </div>
                            <div className="text-left md:text-right">
                              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${returnStatusToneMap[request.status]}`}>
                                {request.status}
                              </span>
                              <p className="mt-2 text-xs text-foreground/45">{formatDate(request.updatedAt)}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-3xl border border-dashed border-border/50 bg-card p-5 text-sm text-foreground/58">
                      No return requests for this order yet.
                    </div>
                  )}

                  {selectedInvoice.status === "delivered" ? (
                    <div className="mt-5 space-y-4 rounded-3xl border border-border/50 bg-card p-5">
                      <div>
                        <p className="text-sm font-bold text-foreground">Create a new return request</p>
                        <p className="mt-1 text-sm leading-6 text-foreground/60">Only remaining returnable quantities are available.</p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1.25fr_0.45fr]">
                        <select
                          value={returnItemId ?? ""}
                          onChange={(event) => {
                            const nextId = Number(event.target.value);
                            setReturnItemId(Number.isFinite(nextId) ? nextId : null);
                            setReturnQuantity(1);
                          }}
                          className="h-12 rounded-2xl border border-border/60 bg-background/80 px-4 text-sm outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                        >
                          <option value="">Select item</option>
                          {selectedInvoice.items
                            .filter((item) => getRemainingReturnableQuantity(selectedInvoice, item) > 0)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.title} • {getRemainingReturnableQuantity(selectedInvoice, item)} available
                              </option>
                            ))}
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={Math.max(selectedReturnItemAvailableQty, 1)}
                          value={returnQuantity}
                          onChange={(event) => setReturnQuantity(Number(event.target.value) || 1)}
                          className="h-12 rounded-2xl border border-border/60 bg-background/80 px-4 text-sm outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                        />
                      </div>

                      <textarea
                        value={returnReason}
                        onChange={(event) => setReturnReason(event.target.value)}
                        rows={3}
                        placeholder="Explain why you want to return this item"
                        className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition-all duration-150 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      />

                      {returnMessage ? (
                        <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                          returnMessage.toLowerCase().includes("submitted")
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                            : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                        }`}>
                          {returnMessage}
                        </div>
                      ) : null}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleSubmitReturn()}
                          disabled={isSubmittingReturn || !returnItemId}
                          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-primary to-emerald-700 px-5 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(16,185,129,0.18)] transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-60"
                        >
                          {isSubmittingReturn ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          Submit Return Request
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[28px] border border-border/50 bg-background/55 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Shipment</p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-3xl border border-border/50 bg-card p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Carrier</p>
                      <p className="mt-2 text-base font-bold text-foreground">{selectedInvoice.carrier || "Carrier pending"}</p>
                      <p className="mt-1 text-sm text-foreground/58">{selectedInvoice.trackingNumber || "Tracking number pending"}</p>
                      {selectedInvoice.trackingUrl ? (
                        <a href={selectedInvoice.trackingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary/80">
                          Open tracking link
                        </a>
                      ) : null}
                    </div>
                    <div className="rounded-3xl border border-border/50 bg-card p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">Delivery windows</p>
                      <p className="mt-2 text-sm text-foreground/68">Estimated: {formatDate(selectedInvoice.estimatedDeliveryAt)}</p>
                      <p className="mt-2 text-sm text-foreground/68">Delivered: {formatDate(selectedInvoice.deliveredAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border/50 bg-background/55 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Receipt Totals</p>
                  <div className="mt-4 space-y-3 rounded-3xl border border-border/50 bg-card p-4 text-sm">
                    <div className="flex items-center justify-between text-foreground/68">
                      <span>Subtotal</span>
                      <span>{formatMoney(selectedInvoice.subtotal)}</span>
                    </div>
                    {selectedInvoice.discountAmount > 0 ? (
                      <div className="flex items-center justify-between text-success">
                        <span>Discount {selectedInvoice.promoCode ? `(${selectedInvoice.promoCode})` : ""}</span>
                        <span>-{formatMoney(selectedInvoice.discountAmount)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-foreground/68">
                      <span>Shipping</span>
                      <span>{formatMoney(selectedInvoice.shipping)}</span>
                    </div>
                    {selectedInvoice.tax > 0 ? (
                      <div className="flex items-center justify-between text-foreground/68">
                        <span>Tax</span>
                        <span>{formatMoney(selectedInvoice.tax)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-base font-bold text-foreground">
                      <span>Total</span>
                      <span>{formatMoney(selectedInvoice.total)}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Invoices;
