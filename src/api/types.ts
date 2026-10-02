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

export interface LoginResponse extends TokenResponse {
  customer: Customer;
}

export interface MessageResponse {
  message: string;
}

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
