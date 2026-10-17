// Friendly names for the API types generated in schema.d.ts (npm run api:types).
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Money = Schemas["Money"];
export type Riel = Schemas["Riel"];
export type Amount = Schemas["Amount"];
export type PageMeta = Schemas["PageMeta"];
export type PageLinks = Schemas["PageLinks"];

export type BookCard = Schemas["BookCard"];
export type BookDetail = Schemas["BookDetail"];
export type BookVariant = Schemas["Variant"];
export type BookFormat = BookVariant["format"];
export type Author = Schemas["Author"];
export type Category = Schemas["Category"];
export type Publisher = Schemas["Publisher"];
export type Series = Schemas["Series"];
export type SeriesDetail = Schemas["SeriesDetail"];
export type Review = Schemas["Review"];
export type OwnReview = Schemas["OwnReview"];
export type RatingSummary = Schemas["RatingSummary"];

export type Customer = Schemas["Customer"];
export type TokenResponse = Schemas["TokenResponse"];
export type Address = Schemas["Address"];
export type AddressInput = Schemas["AddressInput"];
export type Cart = Schemas["Cart"];
export type CartLine = NonNullable<Cart["items"]>[number];
export type CartIssue = Schemas["CartIssue"];
export type CouponCheck = Schemas["CouponCheck"];
export type CheckoutPreview = Schemas["CheckoutPreview"];
export type Order = Schemas["Order"];
export type OrderStatus = NonNullable<Order["status"]>;
export type OrderItem = NonNullable<Order["items"]>[number];
export type ReturnRequest = Schemas["Return"];
/** What an invoice or packing slip prints (KHR at the rate in force when the order was placed). */
export type OrderDocument = Schemas["OrderDocument"];
export type EstimatedDelivery = Schemas["EstimatedDelivery"];
export type DeliveryProvince = Schemas["DeliveryProvince"];
export type DeliveryOptionsData = Schemas["DeliveryOptionsData"];
export type UploadedMedia = Schemas["UploadedMedia"];

/** Laravel resource collection with pagination. */
export interface Paginated<T> {
  data: T[];
  links: PageLinks;
  meta: PageMeta;
}

/** Single resource wrapped in `data`. */
export interface Resource<T> {
  data: T;
}

export interface BookReviewsPage extends Paginated<Review> {
  meta: PageMeta & { rating_summary: RatingSummary };
}

export type WishlistReadingStatus = "want_to_read" | "reading" | "finished";

export interface WishlistCounts {
  all: number;
  want_to_read: number;
  reading: number;
  finished: number;
}

export interface WishlistBookCard extends BookCard {
  wishlist_status?: WishlistReadingStatus;
  wishlist_saved_at?: string;
}

export interface WishlistPageData extends Paginated<WishlistBookCard> {
  meta: PageMeta & { counts?: WishlistCounts };
}

export interface LoginResponse extends TokenResponse {
  customer: Customer;
}

export interface MessageResponse {
  message: string;
}

export type StockAlert = Schemas["StockAlert"];

/** GET /orders/{id}/returnable-items */
export interface ReturnableItems {
  order_id: number;
  returnable_until: string | null;
  can_request_return: boolean;
  reason_unavailable: string | null;
  items: Array<{
    order_item_id: number;
    title: string | null;
    format: BookFormat;
    purchased_quantity: number;
    returnable_quantity: number;
  }>;
}
