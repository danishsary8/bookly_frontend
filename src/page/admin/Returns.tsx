import { useEffect, useMemo, useState, type ComponentType } from "react";
import { BadgeDollarSign, CheckCircle2, Clock3, PackageSearch, RotateCcw, Search, ShieldAlert, Undo2, XCircle } from "lucide-react";
import adminService from "../../services/admin.service";
import type { ReturnRequest } from "../../types/customer.types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const statusToneMap: Record<ReturnRequest["status"], string> = {
  requested: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-sky-100 text-sky-700 border-sky-200",
  received: "bg-violet-100 text-violet-700 border-violet-200",
  refunded: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusIconMap = {
  requested: Clock3,
  approved: CheckCircle2,
  received: PackageSearch,
  refunded: BadgeDollarSign,
  rejected: XCircle,
} satisfies Record<ReturnRequest["status"], ComponentType<{ className?: string }>>;

const statusOrder: Array<ReturnRequest["status"] | "all"> = ["all", "requested", "approved", "received", "refunded", "rejected"];

const Returns = () => {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOrder)[number]>("all");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await adminService.getReturnRequests();
      setReturnRequests(data);
      setNotes(Object.fromEntries(data.map((item) => [item.id, item.adminNote || ""])));
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Unable to load return requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReturns();
  }, []);

  const summary = useMemo(() => ({
    total: returnRequests.length,
    open: returnRequests.filter((item) => ["requested", "approved", "received"].includes(item.status)).length,
    refunded: returnRequests.filter((item) => item.status === "refunded").length,
    refundValue: returnRequests
      .filter((item) => item.status === "refunded")
      .reduce((sum, item) => sum + item.refundAmount, 0),
  }), [returnRequests]);

  const filteredReturns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return returnRequests.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.invoiceId,
        item.customerName,
        item.customerEmail,
        item.bookTitle,
        item.reason,
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [query, returnRequests, statusFilter]);

  const handleStatusUpdate = async (returnId: number, status: ReturnRequest["status"]) => {
    try {
      setSavingId(returnId);
      setError("");
      setSuccess("");
      const updated = await adminService.updateReturnRequest(returnId, {
        status,
        admin_note: notes[returnId]?.trim() || null,
      });
      setReturnRequests((prev) => prev.map((item) => item.id === returnId ? updated : item));
      setNotes((prev) => ({ ...prev, [returnId]: updated.adminNote || "" }));
      setSuccess(`Return #${returnId} updated to ${status}.`);
    } catch (updateError: any) {
      setError(updateError?.response?.data?.message || "Unable to update return request.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">After-Sales Control</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Returns & Refunds</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Review customer return requests, approve the intake flow, and complete refunds with inventory restoration.
            </p>
          </div>

          <div className="grid min-w-[320px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Open Requests</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.open}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Refunded Value</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{currencyFormatter.format(summary.refundValue)}</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Requests</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{summary.total}</p>
          <p className="mt-2 text-sm text-slate-500">All return cases across delivered orders.</p>
        </article>

        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Awaiting Review</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{returnRequests.filter((item) => item.status === "requested").length}</p>
          <p className="mt-2 text-sm text-slate-500">Fresh customer requests that need an admin decision.</p>
        </article>

        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <PackageSearch className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Received</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{returnRequests.filter((item) => item.status === "received").length}</p>
          <p className="mt-2 text-sm text-slate-500">Products received and waiting for refund completion.</p>
        </article>

        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Undo2 className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Refunded</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{summary.refunded}</p>
          <p className="mt-2 text-sm text-slate-500">Completed refund cycles with stock returned.</p>
        </article>
      </section>

      <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Queue</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Return Requests</h2>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by invoice, customer, or book"
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm font-semibold text-slate-600">Loading returns...</div>
          ) : (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-2 py-3">Case</th>
                  <th className="px-2 py-3">Customer</th>
                  <th className="px-2 py-3">Book</th>
                  <th className="px-2 py-3">Refund</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Admin Note</th>
                  <th className="px-2 py-3">Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.length ? filteredReturns.map((item) => {
                  const Icon = statusIconMap[item.status];
                  return (
                    <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-2 py-4">
                        <p className="font-bold text-slate-900">#{item.id}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.invoiceId}</p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-2 py-4">
                        <p className="font-semibold text-slate-900">{item.customerName}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.customerEmail}</p>
                      </td>
                      <td className="px-2 py-4">
                        <p className="font-semibold text-slate-900">{item.bookTitle}</p>
                        <p className="mt-1 text-xs text-slate-500">Qty {item.quantity} | {item.authorName}</p>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.reason}</p>
                      </td>
                      <td className="px-2 py-4 font-bold text-slate-900">{currencyFormatter.format(item.refundAmount)}</td>
                      <td className="px-2 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase ${statusToneMap[item.status]}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <textarea
                          value={notes[item.id] ?? ""}
                          onChange={(event) => setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                          rows={2}
                          placeholder="Internal note for this case"
                          className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40"
                        />
                      </td>
                      <td className="px-2 py-4">
                        <select
                          value={item.status}
                          onChange={(event) => void handleStatusUpdate(item.id, event.target.value as ReturnRequest["status"])}
                          disabled={savingId === item.id}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200/40 disabled:opacity-60"
                        >
                          <option value="requested">requested</option>
                          <option value="approved">approved</option>
                          <option value="received">received</option>
                          <option value="refunded">refunded</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-2 py-10 text-center text-sm text-slate-500">No return requests match the current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default Returns;
