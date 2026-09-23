export interface Book {
    id: number;
    title: string;
    description: string;
    price: number;
    stock?: number;
    created_at?: string;
    author_id?: number;
    category_id?: number;
    author_name: string;
    published_date?: string;
    book_img: string;
    category_name: string;
    purchase_count?: number;
    average_rating?: number;
    review_count?: number;
}

export interface BookReview {
    id: number;
    book_id: number;
    customer_id: number;
    customer_name: string;
    rating: number;
    comment: string;
    is_verified_purchase: boolean;
    created_at: string;
    updated_at: string;
}

export interface BookReviewPayload {
    rating: number;
    comment: string;
}

export interface BookMutationData {
    title: string;
    description?: string;
    price: number;
    stock: number;
    author_id: number;
    category_id: number;
    published_date?: string;
    book_img?: string;
}

export interface BookResponse {
    status: string;
    data: Book[];
    meta?: BookCatalogMeta;
}

export interface BookPriceResponse {
    status: string;
    data: BookPrice[];
}
export interface BookPrice {
    price: number;
}

export interface BookCategoryResponse {
    status: string;
    data: BookCategory[];
}

export interface BookCategory {
    id: number
    name: string;
    book_count?: number;
}

export interface BookAuthor {
    id: number;
    name: string;
    book_count?: number;
}

export interface InventoryMovement {
    id: number;
    book_id: number;
    book_title: string;
    author_name: string;
    change_type: "created" | "adjustment" | "sale" | "restock";
    quantity_change: number;
    stock_before: number;
    stock_after: number;
    reference_type?: string | null;
    reference_id?: string | null;
    note?: string | null;
    created_at: string;
}

export interface BookAuthorResponse {
    status: string;
    data: BookAuthor[];
}

export interface BookQueryParams {
    search?: string;
    category_id?: number;
    author_id?: number;
    min_price?: number;
    max_price?: number;
    sort?: "newest" | "price_asc" | "price_desc" | "title_asc" | "title_desc" | "popular";
    page?: number;
    limit?: number;
}

export interface BookCatalogMeta {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
    sort: NonNullable<BookQueryParams["sort"]>;
    price_range: {
        min: number;
        max: number;
    };
}

export interface BookCountResponse {
    status: string;
    total_books: number;
}

export interface BookCount {
    total_books: number;
}
