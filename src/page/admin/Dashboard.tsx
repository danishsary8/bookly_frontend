import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookCopy,
  DollarSign,
  PackageCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BookCoverImage from "../../components/BookCoverImage";
import adminService from "../../services/admin.service";
import type { CustomerInvoice, DashboardAnalytics, DashboardMonthlySalesPoint } from "../../types/customer.types";

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

const buildLinePath = (points: DashboardMonthlySalesPoint[]) => {
  if (!points.length) {
    return "";
  }

  const width = 100;
  const height = 100;
  const maxValue = Math.max(...points.map((point) => point.revenue), 1);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point.revenue / maxValue) * 78 - 8;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const Dashboard = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [analyticsData, invoiceData] = await Promise.all([
        adminService.getDashboardAnalytics(),
        adminService.getInvoices(),
      ]);
      setAnalytics(analyticsData);
      setInvoices(invoiceData);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleStatusChange = async (invoiceId: string, status: CustomerInvoice["status"]) => {
    try {
      setError("");
      setSuccess("");
      await adminService.updateInvoiceStatus(invoiceId, { status });
      setSuccess(`Invoice ${invoiceId} updated to ${status}.`);
      await loadDashboard();
    } catch (updateError: any) {
      setError(updateError?.response?.data?.message || "Unable to update invoice status.");
    }
  };

  const summary = analytics?.summary;

  const growthSignals = useMemo(() => {
    if (!analytics || analytics.monthly_sales.length < 2) {
      return { revenueDirection: "stable", revenueDelta: 0 };
    }

    const current = analytics.monthly_sales[analytics.monthly_sales.length - 1]?.revenue ?? 0;
    const previous = analytics.monthly_sales[analytics.monthly_sales.length - 2]?.revenue ?? 0;
    const delta = current - previous;

    return {
      revenueDirection: delta >= 0 ? "up" : "down",
      revenueDelta: delta,
    };
  }, [analytics]);

  const statCards = summary
    ? [
        {
          label: "Revenue",
          value: currencyFormatter.format(summary.revenue_total),
          meta: growthSignals.revenueDelta === 0 ? "No month-over-month change" : `${growthSignals.revenueDelta >= 0 ? "+" : "-"}${currencyFormatter.format(Math.abs(growthSignals.revenueDelta))} vs last month`,
          tone: growthSignals.revenueDirection === "down" ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50",
          icon: DollarSign,
          trendUp: growthSignals.revenueDirection !== "down",
        },
        {
          label: "Orders",
          value: summary.total_orders.toString(),
          meta: `${summary.completed_orders} completed`,
          tone: "text-sky-600 bg-sky-50",
          icon: ShoppingBag,
          trendUp: true,
        },
        {
          label: "Customers",
          value: summary.total_customers.toString(),
          meta: `${summary.open_orders} open orders`,
          tone: "text-violet-600 bg-violet-50",
          icon: Users,
          trendUp: true,
        },
        {
          label: "Books",
          value: summary.total_books.toString(),
          meta: `${analytics?.low_stock_books.length ?? 0} low stock alerts`,
          tone: "text-orange-600 bg-orange-50",
          icon: BookCopy,
          trendUp: (analytics?.low_stock_books.length ?? 0) === 0,
        },
      ]
    : [];

  const chartPath = buildLinePath(analytics?.monthly_sales ?? []);
  const recentOrders = invoices.slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Store Intelligence</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Professional Admin Overview</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Live ecommerce performance across revenue, orders, catalogue health, and product demand. The dashboard is now tied to backend analytics instead of placeholder trends.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Completed</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary?.completed_orders ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Cancelled</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary?.cancelled_orders ?? 0}</p>
            </div>
            <div className="col-span-2 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Inventory Watch</p>
              <p className="mt-2 text-2xl font-bold">{analytics?.low_stock_books.length ?? 0} books need stock review</p>
              <p className="mt-2 text-sm text-white/70">Products at 5 units or below are surfaced automatically for faster replenishment.</p>
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

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-600">
          Loading admin analytics...
        </div>
      ) : analytics ? (
        <>
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl ${card.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${card.trendUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {card.trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      Live
                    </div>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{card.value}</p>
                  <p className="mt-3 text-sm leading-5 text-slate-500">{card.meta}</p>
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.9fr]">
            <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Sales Report</p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900">{currencyFormatter.format(summary?.revenue_total ?? 0)}</h2>
                  <p className="mt-2 text-sm text-slate-500">Revenue from valid invoices over the last 6 months, including delivered orders.</p>
                </div>
                <div className="flex gap-2">
                  {analytics.status_breakdown.map((item) => (
                    <span key={item.status} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase ${statusToneMap[item.status]}`}>
                      {item.status}: {item.total}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,247,237,0.65),rgba(255,255,255,0.95))] p-5">
                <div className="h-72">
                  <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
                    {[20, 40, 60, 80].map((marker) => (
                      <line key={marker} x1="0" y1={marker} x2="100" y2={marker} stroke="#e5e7eb" strokeDasharray="1.5 2.5" strokeWidth="0.4" />
                    ))}
                    {analytics.monthly_sales.map((point, index) => {
                      const x = analytics.monthly_sales.length === 1 ? 50 : (index / Math.max(analytics.monthly_sales.length - 1, 1)) * 100;
                      const maxValue = Math.max(...analytics.monthly_sales.map((entry) => entry.revenue), 1);
                      const y = 100 - (point.revenue / maxValue) * 78 - 8;
                      return (
                        <g key={point.month_start}>
                          <circle cx={x} cy={y} r="1.8" fill="#f97316" />
                          <text x={x} y="98" textAnchor="middle" fontSize="3.1" fill="#64748b">{point.month}</text>
                        </g>
                      );
                    })}
                    {chartPath && <path d={chartPath} fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
                  </svg>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {analytics.monthly_sales.slice(-3).map((point) => (
                    <div key={`summary-${point.month_start}`} className="rounded-2xl border border-white/80 bg-white/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{point.month}</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">{currencyFormatter.format(point.revenue)}</p>
                      <p className="mt-1 text-xs text-slate-500">{point.order_count} valid orders</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Top Products</p>
                    <h3 className="text-xl font-bold text-slate-900">Best Performing Books</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {analytics.top_books.length ? analytics.top_books.map((book) => (
                    <div key={`top-${book.book_id}-${book.title}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="relative h-20 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <BookCoverImage src={book.book_img} alt={book.title} author={book.author_name} className="h-full w-full object-cover" iconClassName="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-bold text-slate-900">{book.title}</p>
                        <p className="mt-1 text-xs text-slate-500">by {book.author_name}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-slate-600">
                          <span>{book.units_sold} sold</span>
                          <span>{currencyFormatter.format(book.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No sales data yet.</p>
                  )}
                </div>
              </article>

              <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Stock Alerts</p>
                    <h3 className="text-xl font-bold text-slate-900">Low Inventory</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {analytics.low_stock_books.length ? analytics.low_stock_books.map((book) => (
                    <div key={`low-${book.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{book.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{book.author_name} | {book.category_name}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${book.stock === 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                          {book.stock} left
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${book.stock === 0 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${Math.max(Math.min(book.stock * 20, 100), 8)}%` }} />
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">All tracked books are above the low-stock threshold.</p>
                  )}
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Operations</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Recent Orders</h2>
                <p className="mt-1 text-sm text-slate-500">Review the latest transactions and update the fulfillment flow without leaving the dashboard.</p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-2 py-3">Order</th>
                    <th className="px-2 py-3">Customer</th>
                    <th className="px-2 py-3">Total</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length ? recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-2 py-4">
                        <p className="font-bold text-slate-900">{order.id}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-2 py-4">
                        <p className="font-semibold text-slate-900">{order.customerName}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{order.items.map((item) => item.title).join(", ")}</p>
                      </td>
                      <td className="px-2 py-4 font-bold text-slate-900">{currencyFormatter.format(order.total)}</td>
                      <td className="px-2 py-4">
                        <span className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase ${statusToneMap[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <select
                          value={order.status}
                          onChange={(event) => void handleStatusChange(order.id, event.target.value as CustomerInvoice["status"])}
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
                      <td colSpan={5} className="px-2 py-8 text-center text-sm text-slate-500">
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
