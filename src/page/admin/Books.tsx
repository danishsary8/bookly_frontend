import { BookOpen, Plus, Search } from "lucide-react";

const Books = () => {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Catalog</p>
                    <h1 className="text-3xl font-bold text-slate-900">Books Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage inventory, metadata, and publishing status.</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60">
                    <Plus size={16} />
                    Add New Book
                </button>
            </div>

            <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                    <div className="relative min-w-[260px] flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search books by title, author, or category"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm outline-none focus:ring-2 focus:ring-orange-300/30"
                        />
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">Showing sample layout only</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[
                        { title: "Clean Code", category: "Programming", stock: "40 in stock", price: "$32.99" },
                        { title: "Atomic Habits", category: "Self-Help", stock: "85 in stock", price: "$18.50" },
                        { title: "The Hobbit", category: "Fantasy", stock: "80 in stock", price: "$17.99" },
                    ].map((book) => (
                        <div key={book.title} className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 grid place-items-center">
                                    <BookOpen size={18} />
                                </div>
                                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-slate-200 text-slate-600 font-bold">{book.category}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 mt-3">{book.title}</h3>
                            <p className="text-xs text-slate-500 mt-1">{book.stock}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-lg font-extrabold text-orange-600">{book.price}</span>
                                <button className="text-xs font-semibold text-slate-600 hover:text-slate-900">Edit</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Books;
