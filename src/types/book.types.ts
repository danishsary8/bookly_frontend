export interface Book {
    id: number;
    title: string;
    description: string;
    price: number;
    stock?: number;
    created_at?: string;
    author_name: string;
    published_date?: string;
    book_img: string;
    category_name: string;
}

export interface BookResponse {
    status: string;
    data: Book[];
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
}


export interface BookCountResponse {
    status: string;
    total_books: number;
}

export interface BookCount {
    total_books: number;
}
