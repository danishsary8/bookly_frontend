import { Mail, MapPin, Phone, TrendingUp, UserRound, Users as UsersIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import adminService from "../../services/admin.service";
import type { AdminCustomerDirectoryItem } from "../../types/customer.types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const Users = () => {
  const [customers, setCustomers] = useState<AdminCustomerDirectoryItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await adminService.getCustomers();
        setCustomers(data);
      } catch (loadError: any) {
        setError(loadError?.response?.data?.message || "Unable to load customer directory.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const needle = searchValue.trim().toLowerCase();
    if (!needle) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.first_name,
        customer.last_name,
        customer.email,
        customer.phone || "",
        customer.address || "",
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [customers, searchValue]);

  const metrics = useMemo(() => {
    const customersWithOrders = customers.filter((customer) => customer.order_count > 0);
    const newThisMonth = customers.filter((customer) => {
      const createdAt = new Date(customer.created_at);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length;
    const totalLifetimeValue = customers.reduce((sum, customer) => sum + customer.lifetime_value, 0);

    return {
      totalCustomers: customers.length,
      activeBuyers: customersWithOrders.length,
      newThisMonth,
      totalLifetimeValue,
    };
  }, [customers]);

  const topCustomers = useMemo(
    () => [...customers].sort((a, b) => b.lifetime_value - a.lifetime_value).slice(0, 4),
    [customers],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Community</p>
          <h1 className="text-3xl font-bold text-slate-900">Customer Operations</h1>
          <p className="text-sm text-slate-500 mt-1">Track customer value, order history, and account contact quality from one place.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-600">
          Loading customer directory...
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Customers</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{metrics.totalCustomers}</p>
              <p className="mt-2 text-sm text-slate-500">Registered customer accounts.</p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Active Buyers</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{metrics.activeBuyers}</p>
              <p className="mt-2 text-sm text-slate-500">Customers with at least one completed non-cancelled order.</p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">New This Month</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{metrics.newThisMonth}</p>
              <p className="mt-2 text-sm text-slate-500">New customer signups in the current calendar month.</p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Lifetime Value</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{currencyFormatter.format(metrics.totalLifetimeValue)}</p>
              <p className="mt-2 text-sm text-slate-500">Total retained customer spend from valid orders.</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Directory</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Customer List</h2>
                </div>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search customer, email, phone, address"
                  className="h-11 min-w-[280px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition-all focus:border-orange-300 focus:ring-2 focus:ring-orange-200/30"
                />
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      <th className="px-2 py-3">Customer</th>
                      <th className="px-2 py-3">Orders</th>
                      <th className="px-2 py-3">Lifetime Value</th>
                      <th className="px-2 py-3">Last Order</th>
                      <th className="px-2 py-3">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length ? filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-slate-100 text-sm text-slate-700">
                        <td className="px-2 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              <UserRound className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{customer.first_name} {customer.last_name}</p>
                              <p className="mt-1 text-xs text-slate-500">Joined {new Date(customer.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 font-semibold text-slate-900">{customer.order_count}</td>
                        <td className="px-2 py-4 font-bold text-slate-900">{currencyFormatter.format(customer.lifetime_value)}</td>
                        <td className="px-2 py-4 text-slate-600">
                          {customer.last_order_at ? new Date(customer.last_order_at).toLocaleString() : "No orders yet"}
                        </td>
                        <td className="px-2 py-4">
                          <div className="space-y-1 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{customer.phone || "No phone"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-2 py-8 text-center text-sm text-slate-500">
                          No customers match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">VIP Customers</p>
                    <h3 className="text-xl font-bold text-slate-900">Top Value Accounts</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {topCustomers.length ? topCustomers.map((customer) => (
                    <div key={`vip-${customer.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{customer.first_name} {customer.last_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{customer.email}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          {currencyFormatter.format(customer.lifetime_value)}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{customer.order_count} valid orders</p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No customer spending data yet.</p>
                  )}
                </div>
              </article>

              <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                    <UsersIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Address Coverage</p>
                    <h3 className="text-xl font-bold text-slate-900">Profile Quality</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {customers.slice(0, 5).map((customer) => (
                    <div key={`address-${customer.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-sm font-bold text-slate-900">{customer.first_name} {customer.last_name}</p>
                      <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{customer.address || "No shipping address stored yet."}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Users;
