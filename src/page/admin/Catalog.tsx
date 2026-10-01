import { Grid2x2, History, Pencil, Plus, Tags, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/ui/modal";
import bookService from "../../services/book.service";
import adminService from "../../services/admin.service";
import type { BookAuthor, BookCategory, InventoryMovement } from "../../types/book.types";

type EntityKind = "author" | "category";

const movementToneMap: Record<InventoryMovement["change_type"], string> = {
  created: "bg-emerald-100 text-emerald-700 border-emerald-200",
  adjustment: "bg-amber-100 text-amber-700 border-amber-200",
  sale: "bg-blue-100 text-blue-700 border-blue-200",
  restock: "bg-violet-100 text-violet-700 border-violet-200",
};

const Catalog = () => {
  const [authors, setAuthors] = useState<BookAuthor[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<EntityKind, string>>({ author: "", category: "" });
  const [editingEntity, setEditingEntity] = useState<{
    kind: EntityKind;
    id: number;
    name: string;
  } | null>(null);
  const [editName, setEditName] = useState("");

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [authorsRes, categoriesRes, movementsRes] = await Promise.all([
        bookService.getAuthors(),
        bookService.getBookCategories(),
        adminService.getInventoryMovements(30),
      ]);

      setAuthors(authorsRes.data);
      setCategories(categoriesRes.data);
      setMovements(movementsRes);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Unable to load catalog operations data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => ({
    authors: authors.length,
    categories: categories.length,
    trackedBooks: new Set(movements.map((movement) => movement.book_id)).size,
    recentMovements: movements.length,
  }), [authors, categories, movements]);

  const handleCreate = async (kind: EntityKind) => {
    const name = drafts[kind].trim();
    if (!name) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      if (kind === "author") {
        await adminService.createAuthor(name);
        setSuccess(`Author "${name}" created.`);
      } else {
        await adminService.createCategory(name);
        setSuccess(`Category "${name}" created.`);
      }
      setDrafts((prev) => ({ ...prev, [kind]: "" }));
      await loadData();
    } catch (createError: any) {
      setError(createError?.response?.data?.message || `Unable to create ${kind}.`);
    }
  };

  const handleDelete = async (kind: EntityKind, id: number, name: string) => {
    try {
      setError("");
      setSuccess("");
      if (kind === "author") {
        await adminService.deleteAuthor(id);
        setSuccess(`Author "${name}" deleted.`);
      } else {
        await adminService.deleteCategory(id);
        setSuccess(`Category "${name}" deleted.`);
      }
      await loadData();
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.message || `Unable to delete ${kind}.`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntity || !editName.trim()) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      if (editingEntity.kind === "author") {
        await adminService.updateAuthor(editingEntity.id, editName.trim());
        setSuccess("Author updated successfully.");
      } else {
        await adminService.updateCategory(editingEntity.id, editName.trim());
        setSuccess("Category updated successfully.");
      }
      setEditingEntity(null);
      setEditName("");
      await loadData();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || "Unable to save changes.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Catalog Operations</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Authors, Categories, and Stock History</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Manage master data separately from books and keep a real audit trail of inventory changes caused by creation, adjustment, sales, and cancellations.
            </p>
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
          <UserRound className="h-6 w-6 text-orange-600" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Authors</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.authors}</p>
        </article>
        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <Tags className="h-6 w-6 text-sky-600" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Categories</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.categories}</p>
        </article>
        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <Grid2x2 className="h-6 w-6 text-violet-600" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tracked Books</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.trackedBooks}</p>
        </article>
        <article className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <History className="h-6 w-6 text-emerald-600" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Recent Movements</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.recentMovements}</p>
        </article>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm font-semibold text-slate-600">
          Loading catalog operations...
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Master Data</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Authors</h2>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <input
                  value={drafts.author}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, author: event.target.value }))}
                  placeholder="Add a new author"
                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                />
                <button
                  type="button"
                  onClick={() => void handleCreate("author")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-orange-200/60"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {authors.map((author) => (
                  <div key={author.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <p className="font-bold text-slate-900">{author.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{author.book_count ?? 0} books linked</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntity({ kind: "author", id: author.id, name: author.name });
                          setEditName(author.name);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete("author", author.id, author.name)}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Master Data</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Categories</h2>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <input
                  value={drafts.category}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Add a new category"
                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                />
                <button
                  type="button"
                  onClick={() => void handleCreate("category")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-orange-200/60"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <p className="font-bold text-slate-900">{category.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{category.book_count ?? 0} books linked</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntity({ kind: "category", id: category.id, name: category.name });
                          setEditName(category.name);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete("category", category.id, category.name)}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Inventory Ledger</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Recent Stock Movements</h2>
              <p className="mt-1 text-sm text-slate-500">Every stock-impacting action is recorded here for reconciliation and mistake tracing.</p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-2 py-3">Book</th>
                    <th className="px-2 py-3">Change</th>
                    <th className="px-2 py-3">Before</th>
                    <th className="px-2 py-3">After</th>
                    <th className="px-2 py-3">Reference</th>
                    <th className="px-2 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-2 py-4">
                        <p className="font-bold text-slate-900">{movement.book_title}</p>
                        <p className="mt-1 text-xs text-slate-500">by {movement.author_name}</p>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase ${movementToneMap[movement.change_type]}`}>
                            {movement.change_type}
                          </span>
                          <span className={`text-sm font-bold ${movement.quantity_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {movement.quantity_change > 0 ? `+${movement.quantity_change}` : movement.quantity_change}
                          </span>
                        </div>
                        {movement.note ? <p className="mt-2 text-xs text-slate-500">{movement.note}</p> : null}
                      </td>
                      <td className="px-2 py-4 font-semibold text-slate-900">{movement.stock_before}</td>
                      <td className="px-2 py-4 font-semibold text-slate-900">{movement.stock_after}</td>
                      <td className="px-2 py-4 text-xs text-slate-500">
                        {movement.reference_type ? `${movement.reference_type}:${movement.reference_id ?? ""}` : "Manual"}
                      </td>
                      <td className="px-2 py-4 text-xs text-slate-500">{new Date(movement.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Modal
        isOpen={Boolean(editingEntity)}
        onClose={() => setEditingEntity(null)}
        title={editingEntity ? `Edit ${editingEntity.kind}` : "Edit"}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            placeholder="Name"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingEntity(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200/60"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Catalog;
