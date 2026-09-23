import type { Book } from "./book.types";

export interface CustomerCountResponse {
  status?: "success" | "error";
  total_customers: number;
}

export interface CustomerProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  role?: string;
  name?: string;
}

export interface CustomerProfileUpdateData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  password?: string;
}

export interface CartItem extends Book {
  book_id: number;
  quantity: number;
  line_total: number;
}

export interface CartResponseData {
  cart_id: number;
  item_count: number;
  subtotal: number;
  items: CartItem[];
}

export interface InvoiceItem {
  id: number;
  book_id: number;
  title: string;
  author_name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface ReturnRequest {
  id: number;
  invoiceId: string;
  invoiceItemId: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  bookId: number;
  bookTitle: string;
  authorName: string;
  quantity: number;
  reason: string;
  status: "requested" | "approved" | "rejected" | "received" | "refunded";
  adminNote?: string | null;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInvoice {
  id: string;
  customerId: number;
  customerEmail: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  promoCode?: string | null;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: "card" | "cod";
  shippingAddress: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  returnRequests: ReturnRequest[];
}

export interface DashboardSummary {
  total_books: number;
  total_customers: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  open_orders: number;
  revenue_total: number;
}

export interface DashboardMonthlySalesPoint {
  month: string;
  month_start: string;
  order_count: number;
  revenue: number;
}

export interface DashboardStatusBreakdown {
  status: CustomerInvoice["status"];
  total: number;
}

export interface DashboardTopBook {
  book_id: number;
  title: string;
  author_name: string;
  book_img: string;
  units_sold: number;
  revenue: number;
}

export interface DashboardLowStockBook {
  id: number;
  title: string;
  stock: number;
  price: number;
  category_name: string;
  author_name: string;
}

export interface DashboardRecentOrder {
  id: string;
  customer_name: string;
  status: CustomerInvoice["status"];
  total: number;
  created_at: string;
}

export interface DashboardAnalytics {
  summary: DashboardSummary;
  monthly_sales: DashboardMonthlySalesPoint[];
  status_breakdown: DashboardStatusBreakdown[];
  top_books: DashboardTopBook[];
  low_stock_books: DashboardLowStockBook[];
  recent_orders: DashboardRecentOrder[];
}

export interface AdminCustomerDirectoryItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  order_count: number;
  lifetime_value: number;
  last_order_at?: string | null;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  support_email: string;
  support_phone?: string | null;
  hero_heading: string;
  hero_subheading: string;
  free_shipping_threshold: number;
  shipping_fee: number;
  tax_rate: number;
  low_stock_threshold: number;
  updated_at: string;
}

export interface StoreSettingsPayload {
  store_name: string;
  support_email: string;
  support_phone?: string | null;
  hero_heading: string;
  hero_subheading: string;
  free_shipping_threshold: number;
  shipping_fee: number;
  tax_rate: number;
  low_stock_threshold: number;
}

export interface StorefrontSettings {
  store_name: string;
  support_email: string;
  support_phone?: string | null;
  hero_heading: string;
  hero_subheading: string;
  free_shipping_threshold: number;
  shipping_fee: number;
  tax_rate: number;
}

export interface CheckoutPreview {
  subtotal: number;
  discountAmount: number;
  promoCode?: string | null;
  discountedSubtotal: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface Promotion {
  id: number;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_subtotal: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionPayload {
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_subtotal: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
}
