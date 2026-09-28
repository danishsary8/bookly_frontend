import { AlertTriangle, Boxes, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BookCoverImage from "../../components/BookCoverImage";
import Modal from "../../components/ui/modal";
import bookService from "../../services/book.service";
import type { Book, BookAuthor, BookCategory, BookMutationData } from "../../types/book.types";

const emptyForm: BookMutationData = {
  title: "",
  description: "",
  price: 0,
  stock: 0,
  author_id: 0,
  category_id: 0,
  published_date: "",
  book_img: "",
};

const Books = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [authorOptions, setAuthorOptions] = useState<BookAuthor[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<BookCategory[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState<BookMutationData>(emptyForm);

  const loadBooks = async () => {
    try {
      setError("");
      const response = await bookService.getBooks({ limit: 500, sort: "newest" });
      setBooks(response.data);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Unable to load books.");
    }
  };

  useEffect(() => {
    void loadBooks();
  }, []);

  useEffect(() => {
    const loadLookupData = async () => {
      try {
        const [authorsResponse, categoriesResponse] = await Promise.all([
          bookService.getAuthors(),
          bookService.getBookCategories(),
        ]);

        setAuthorOptions(authorsResponse.data);
        setCategoryOptions(categoriesResponse.data);
      } catch (lookupError: any) {
        setError(lookupError?.response?.data?.message || "Unable to load catalogue reference data.");
      }
    };

    void loadLookupData();
  }, []);

  const filteredBooks = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) {
      return books;
    }

    return books.filter((book) =>
      [book.title, book.author_name, book.category_name].some((value) =>
        value?.toLowerCase().includes(search),
      ),
    );
  }, [books, searchValue]);

  const inventorySummary = useMemo(() => {
    const lowStock = books.filter((book) => (book.stock || 0) > 0 && (book.stock || 0) <= 5).length;
    const outOfStock = books.filter((book) => (book.stock || 0) === 0).length;
    const inventoryUnits = books.reduce((sum, book) => sum + (book.stock || 0), 0);

    return {
      totalTitles: books.length,
      lowStock,
      outOfStock,
      inventoryUnits,
    };
  }, [books]);

  const openCreateModal = () => {
    setEditingBook(null);
    setForm({
      ...emptyForm,
      author_id: authorOptions[0]?.id || 0,
      category_id: categoryOptions[0]?.id || 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      description: book.description || "",
      price: Number(book.price),
      stock: book.stock || 0,
      author_id: book.author_id || authorOptions[0]?.id || 0,
      category_id: book.category_id || categoryOptions[0]?.id || 0,
      published_date: book.published_date || "",
      book_img: book.book_img || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editingBook) {
        await bookService.updateBook(editingBook.id, form);
        setSuccess("Book updated successfully.");
      } else {
        await bookService.createBook(form);
        setSuccess("Book created successfully.");
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      setEditingBook(null);
      await loadBooks();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || "Unable to save book.");
    }
  };

  const handleDelete = async (bookId: number) => {
    try {
      setError("");
      setSuccess("");
      await bookService.deleteBook(bookId);
      setSuccess("Book deleted successfully.");
      await loadBooks();
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.message || "Unable to delete book.");
    }
  };

  const handleQuickRestock = async (book: Book) => {
    try {
      setError("");
      setSuccess("");
      await bookService.updateBook(book.id, {
        title: book.title,
        description: book.description || "",
        price: Number(book.price),
        stock: (book.stock || 0) + 5,
        author_id: book.author_id || 0,
        category_id: book.category_id || 0,
        published_date: book.published_date || "",
        book_img: book.book_img || "",
      });
      setSuccess(`Added 5 units to "${book.title}".`);
      await loadBooks();
    } catch (restockError: any) {
      setError(restockError?.response?.data?.message || "Unable to restock book.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2">Catalog</p>
          <h1 className="text-3xl font-bold text-slate-900">Books Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage inventory, metadata, and publishing status.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60"
        >
          <Plus size={16} />
          Add New Book
        </button>
      </div>

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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Titles</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{inventorySummary.totalTitles}</p>
          <p className="mt-2 text-sm text-slate-500">Books currently managed in the catalogue.</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Units In Stock</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{inventorySummary.inventoryUnits}</p>
          <p className="mt-2 text-sm text-slate-500">Total sellable inventory across all products.</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Low Stock</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{inventorySummary.lowStock}</p>
          <p className="mt-2 text-sm text-slate-500">Books with 1 to 5 units remaining.</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Out Of Stock</p>
          <p className="mt-3 text-3xl font-bold text-rose-600">{inventorySummary.outOfStock}</p>
          <p className="mt-2 text-sm text-slate-500">Products that need immediate replenishment.</p>
        </div>
      </section>

      <div className="bg-white/90 rounded-3xl border border-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search books by title, author, or category"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm outline-none focus:ring-2 focus:ring-orange-300/30"
            />
          </div>
          <div className="text-xs text-slate-500 font-semibold">{filteredBooks.length} books loaded</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBooks.map((book) => (
            <div key={book.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <div className="flex items-start gap-4">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <BookCoverImage src={book.book_img} alt={book.title} className="h-full w-full object-cover" iconClassName="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-slate-200 text-slate-600 font-bold">
                      {book.category_name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        (book.stock || 0) === 0
                          ? "bg-rose-100 text-rose-700"
                          : (book.stock || 0) <= 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {(book.stock || 0) === 0 ? "Out" : (book.stock || 0) <= 5 ? "Low" : "Healthy"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-3 line-clamp-2">{book.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">by {book.author_name}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Boxes className="h-3.5 w-3.5" />
                    <span>{book.stock || 0} in stock</span>
                  </div>
                  {(book.stock || 0) <= 5 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Reorder soon
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-lg font-extrabold text-orange-600">${Number(book.price).toFixed(2)}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50"
                    onClick={() => void handleQuickRestock(book)}
                  >
                    +5 Stock
                  </button>
                  <button className="h-9 w-9 rounded-lg border border-slate-200 grid place-items-center text-slate-600 hover:text-slate-900" onClick={() => openEditModal(book)}>
                    <Pencil size={16} />
                  </button>
                  <button className="h-9 w-9 rounded-lg border border-rose-200 grid place-items-center text-rose-600 hover:bg-rose-50" onClick={() => void handleDelete(book.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBook ? "Edit Book" : "Create Book"}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <input
              value={form.price}
              type="number"
              min="0"
              step="0.01"
              onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
              placeholder="Price"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <input
              value={form.stock}
              type="number"
              min="0"
              onChange={(e) => setForm((prev) => ({ ...prev, stock: Number(e.target.value) }))}
              placeholder="Stock"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <input
              value={form.published_date || ""}
              type="date"
              onChange={(e) => setForm((prev) => ({ ...prev, published_date: e.target.value }))}
              placeholder="Published date"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
            <select
              value={form.author_id}
              onChange={(e) => setForm((prev) => ({ ...prev, author_id: Number(e.target.value) }))}
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value={0}>Select author</option>
              {authorOptions.map((author) => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </select>
            <select
              value={form.category_id}
              onChange={(e) => setForm((prev) => ({ ...prev, category_id: Number(e.target.value) }))}
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value={0}>Select category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <input
            type="url"
            value={form.book_img || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, book_img: e.target.value }))}
            placeholder="https://res.cloudinary.com/.../book.jpg"
            aria-label="Cloudinary book image URL"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />
          <p className="-mt-2 text-xs text-slate-500">
            Paste the complete Cloudinary delivery URL. This value is saved directly to the books.book_img column.
          </p>
          {form.book_img ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Cover Preview</p>
              <div className="relative h-56 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <BookCoverImage src={form.book_img} alt={form.title || "Book cover"} className="h-full w-full object-cover" iconClassName="h-6 w-6" />
              </div>
            </div>
          ) : null}
          <textarea
            value={form.description || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-200/60"
            >
              {editingBook ? "Save Changes" : "Create Book"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Books;
