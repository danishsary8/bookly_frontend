import { Save, SlidersHorizontal, Bell, Shield } from "lucide-react";

const Settings = () => {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Preferences</p>
                    <h1 className="text-3xl font-bold text-slate-900">Admin Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure your dashboard appearance and account options.</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60">
                    <Save size={16} />
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 grid place-items-center">
                            <SlidersHorizontal size={16} />
                        </div>
                        <h2 className="font-bold text-slate-900">General</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        <label className="block">
                            <span className="text-slate-600">Dashboard Title</span>
                            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300/30" defaultValue="Bookly Admin" />
                        </label>
                        <label className="block">
                            <span className="text-slate-600">Timezone</span>
                            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300/30" defaultValue="Asia/Phnom_Penh" />
                        </label>
                    </div>
                </div>

                <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 grid place-items-center">
                            <Bell size={16} />
                        </div>
                        <h2 className="font-bold text-slate-900">Notifications</h2>
                    </div>
                    <div className="space-y-3 text-sm text-slate-600">
                        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            Email alerts
                            <input type="checkbox" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            Weekly summary
                            <input type="checkbox" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            New user notifications
                            <input type="checkbox" />
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
                        <Shield size={16} />
                    </div>
                    <h2 className="font-bold text-slate-900">Security</h2>
                </div>
                <p className="text-sm text-slate-500">Security preferences panel is ready for integration.</p>
            </div>
        </div>
    );
};

export default Settings;
