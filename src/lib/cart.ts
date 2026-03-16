import type { Book } from "../types/book.types";

export interface CartItem extends Book {
  quantity: number;
  addedAt: string;
}

const CART_STORAGE_KEY = "bookly-cart-v1";
const CART_EVENT = "cart-changed";

const normalizeCart = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  const normalized: CartItem[] = [];

  for (const item of raw) {
    const candidate = item as Partial<CartItem>;
    if (
      typeof candidate?.id !== "number" ||
      typeof candidate?.title !== "string" ||
      typeof candidate?.author_name !== "string" ||
      typeof candidate?.book_img !== "string" ||
      typeof candidate?.category_name !== "string"
    ) {
      continue;
    }

    const parsedQuantity = Number(candidate.quantity ?? 1);
    normalized.push({
      id: candidate.id,
      title: candidate.title,
      description: candidate.description ?? "",
      price: Number(candidate.price ?? 0),
      stock: candidate.stock,
      created_at: candidate.created_at,
      author_name: candidate.author_name,
      published_date: candidate.published_date,
      book_img: candidate.book_img,
      category_name: candidate.category_name,
      quantity: Number.isNaN(parsedQuantity) ? 1 : Math.max(1, parsedQuantity),
      addedAt: candidate.addedAt ?? new Date().toISOString()
    });
  }

  return normalized;
};

const emitCartChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_EVENT));
  }
};

export const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return normalizeCart(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveCart = (items: CartItem[]) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartChanged();
};

export const addToCart = (book: Book, quantity = 1): CartItem[] => {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const current = loadCart();
  const existing = current.find((item) => item.id === book.id);

  if (existing) {
    const updated = current.map((item) =>
      item.id === book.id ? { ...item, quantity: item.quantity + safeQuantity } : item
    );
    saveCart(updated);
    return updated;
  }

  const next: CartItem = {
    ...book,
    quantity: safeQuantity,
    addedAt: new Date().toISOString()
  };
  const updated = [next, ...current];
  saveCart(updated);
  return updated;
};

export const removeFromCart = (bookId: number): CartItem[] => {
  const updated = loadCart().filter((item) => item.id !== bookId);
  saveCart(updated);
  return updated;
};

export const updateCartItemQuantity = (bookId: number, quantity: number): CartItem[] => {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const updated = loadCart().map((item) =>
    item.id === bookId ? { ...item, quantity: safeQuantity } : item
  );
  saveCart(updated);
  return updated;
};

export const clearCart = () => {
  localStorage.removeItem(CART_STORAGE_KEY);
  emitCartChanged();
};

export const cartItemCount = (items = loadCart()): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export const cartSubtotal = (items = loadCart()): number =>
  items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

export const CART_CHANGED_EVENT = CART_EVENT;
