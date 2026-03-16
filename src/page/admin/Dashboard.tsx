import {
    BookOpen,
    Users,
    DollarSign,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    MoreVertical
} from "lucide-react";
import { useEffect, useState } from "react";
import bookService from "../../services/book.service";

const Dashboard = () => {
    const [totalBook, setTotalBook] = useState<number>(0);

    useEffect(() => {
        const fetchTotalBook = async () => {
            const response = await bookService.getBookCount();
            setTotalBook(response.total_books);
        };
        fetchTotalBook();
    }, []);

    const stats = [
        {
            label: "Total Books",
            value: totalBook,
            change: "+12.5%",
            isPositive: true,
            icon: BookOpen,
            color: "text-orange-600",
            bg: "bg-orange-50",
            trend: [40, 70, 45, 90, 65, 80, 95]
        },
        {
            label: "Active Users",
            value: "45,210",
            change: "+8.2%",
            isPositive: true,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            trend: [30, 45, 60, 50, 80, 75, 100]
        },
        {
            label: "Total Revenue",
            value: "$12,450",
            change: "+24.1%",
            isPositive: true,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            trend: [50, 40, 70, 60, 90, 85, 110]
        },
        {
            label: "Unfulfilled Orders",
            value: "18",
            change: "-4.5%",
            isPositive: false,
            icon: TrendingUp,
            color: "text-rose-600",
            bg: "bg-rose-50",
            trend: [90, 80, 70, 75, 60, 55, 40]
        },
    ];

    const recentOrders = [
        { id: "#ORD-9982", user: "Sok Rathana", book: "Modern React Architecture", status: "Delivered", amount: "$45.00", date: "2 mins ago" },
        { id: "#ORD-9981", user: "Phnom Srey", book: "Design Patterns in JS", status: "Processing", amount: "$32.50", date: "15 mins ago" },
        { id: "#ORD-9980", user: "Keo Pisey", book: "Learning Laravel 11", status: "Pending", amount: "$28.00", date: "1 hour ago" },
        { id: "#ORD-9979", user: "Chan Dara", book: "Tailwind Masterclass", status: "Delivered", amount: "$19.99", date: "3 hours ago" },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Overview</p>
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Track store performance and review recent activity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="group bg-white/85 rounded-3xl p-6 border border-white/80 shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_44px_rgba(15,23,42,0.12)] transition-all duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.isPositive ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"}`}>
                                    {stat.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {stat.change}
                                </div>
                            </div>

                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stat.value}</h3>

                            <div className="mt-6 flex items-end gap-1 h-8">
                                {stat.trend.map((val, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex-1 rounded-full opacity-50 group-hover:opacity-100 transition-all duration-500 ${stat.color.replace("text", "bg")}`}
                                        style={{ height: `${val}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/90 rounded-3xl border border-white/80 shadow-[0_14px_34px_rgba(15,23,42,0.07)] overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Live Transaction Feed</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Updated every 30 seconds</p>
                        </div>
                        <button className="text-orange-600 text-sm font-bold hover:underline">View Analytics Report</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/60">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Value</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentOrders.map((order, i) => (
                                    <tr key={i} className="group hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-900">{order.id}</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[150px]">{order.book}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-800">{order.user}</p>
                                            <p className="text-[10px] text-slate-400">{order.date}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`
                                                inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter
                                                ${order.status === "Delivered" ? "bg-emerald-100 text-emerald-700" :
                                                    order.status === "Processing" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}
                                            `}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-extrabold text-slate-900">{order.amount}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/30 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                        <h4 className="text-xl font-bold mb-2 relative z-10">Export Summary</h4>
                        <p className="text-slate-300 text-sm mb-6 relative z-10 leading-relaxed">Generate your monthly business overview with clean visual reports.</p>
                        <button className="w-full py-4 bg-white text-slate-900 font-extrabold rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-100 transition-all shadow-xl shadow-black/10">
                            Download PDF Report
                            <ArrowUpRight size={18} />
                        </button>
                    </div>

                    <div className="bg-white/90 rounded-3xl p-6 border border-white/80 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
                        <h4 className="text-sm font-extrabold text-slate-900 mb-6 uppercase tracking-wider">Top Performing Categories</h4>
                        <div className="space-y-6">
                            {[
                                { label: "Software Engineering", val: 85, color: "bg-orange-500" },
                                { label: "Fiction & Novels", val: 62, color: "bg-blue-500" },
                                { label: "Business Strategy", val: 44, color: "bg-emerald-500" }
                            ].map((cat, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-700">{cat.label}</span>
                                        <span className="text-slate-400">{cat.val}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.val}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
