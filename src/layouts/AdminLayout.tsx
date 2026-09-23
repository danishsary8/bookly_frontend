import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LayoutGrid,
  BadgePercent,
  BookCopy,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Menu,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import authService from "../services/auth.service";
import { getStoredUser } from "../lib/session";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [admin, setAdmin] = useState<any>(getStoredUser());

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (isMounted) {
          setAdmin(userData);
        }
      } catch (error) {
        console.error("Failed to fetch admin user:", error);
      }
    };

    if (!admin) {
      void fetchUser();
    }

    return () => {
      isMounted = false;
    };
  }, [admin]);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/superadmin/login");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/superadmin" },
    { icon: ShoppingBag, label: "Orders", path: "/superadmin/orders" },
    { icon: RotateCcw, label: "Returns", path: "/superadmin/returns" },
    { icon: LayoutGrid, label: "Catalog", path: "/superadmin/catalog" },
    { icon: BadgePercent, label: "Promotions", path: "/superadmin/promotions" },
    { icon: BookCopy, label: "Books", path: "/superadmin/books" },
    { icon: Users, label: "Customers", path: "/superadmin/users" },
    { icon: Settings, label: "Settings", path: "/superadmin/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8f7f4] font-sans selection:bg-primary/20 text-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-300/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-amber-300/10 blur-[110px]" />
      </div>

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "w-72" : "w-20"}
          bg-white/85 backdrop-blur-xl border-r border-white/70
          flex flex-col shadow-[1px_0_24px_rgba(15,23,42,0.08)]
        `}
      >
        <div className="p-6 h-20 flex items-center gap-3 border-b border-slate-100">
          <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-300/40">
            <ShieldCheck className="text-white h-6 w-6" />
          </div>
          {isSidebarOpen && (
            <h2 className="text-xl font-bold tracking-tight text-slate-800 animate-in fade-in duration-500">
              Book<span className="text-primary italic">Admin</span>
            </h2>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200
                  ${isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-200/50 scale-[1.02]"
                    : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
                  }
                `}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? "" : "text-slate-400"}`} />
                {isSidebarOpen && (
                  <span className="flex-1 animate-in slide-in-from-left-2 duration-300">{item.label}</span>
                )}
                {isActive && isSidebarOpen && <ChevronRight className="h-4 w-4 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => void handleLogout()}
            className="
              flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
              text-rose-500/80 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200
            "
          >
            <LogOut className="h-5 w-5" />
            {isSidebarOpen && <span className="animate-in fade-in">Logout</span>}
          </button>
        </div>
      </aside>

      <main
        className={`
          flex-1 flex flex-col relative z-10 transition-all duration-300
          ${isSidebarOpen ? "ml-72" : "ml-20"}
        `}
      >
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-white/70 flex items-center justify-between px-8 sticky top-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              <Menu size={20} />
            </button>
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Universal search..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/70 border border-transparent focus:bg-white focus:border-orange-300/40 focus:ring-4 focus:ring-orange-200/30 rounded-xl text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white" />
            </button>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                  {admin?.name || [admin?.first_name, admin?.last_name].filter(Boolean).join(" ") || "Admin"}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {admin?.role || "Main Administrator"}
                </p>
              </div>
              <div className="relative">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                  <span className="text-white font-bold text-xs">
                    {(admin?.name || admin?.email || "AD").substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow-sm" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
