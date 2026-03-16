import { Users as UsersIcon, UserPlus, Shield, UserRound } from "lucide-react";

const Users = () => {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Community</p>
                    <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor customer activity and role distribution.</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 text-white font-semibold shadow-lg">
                    <UserPlus size={16} />
                    Invite User
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: "Total Users", value: "45,210", icon: UsersIcon, color: "text-orange-600 bg-orange-50" },
                    { label: "Admins", value: "08", icon: Shield, color: "text-blue-600 bg-blue-50" },
                    { label: "New This Week", value: "124", icon: UserRound, color: "text-emerald-600 bg-emerald-50" },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="bg-white/90 border border-white/80 rounded-3xl p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
                            <div className={`h-10 w-10 rounded-xl grid place-items-center ${item.color}`}>
                                <Icon size={18} />
                            </div>
                            <p className="text-sm text-slate-500 mt-4">{item.label}</p>
                            <h3 className="text-2xl font-extrabold text-slate-900">{item.value}</h3>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
                <h2 className="font-bold text-slate-900 mb-4">Recent User Activity</h2>
                <div className="space-y-3">
                    {["john.doe@gmail.com signed in", "sarah.lee@example.com updated profile", "admin@example.com granted moderator role"].map((item) => (
                        <div key={item} className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Users;
