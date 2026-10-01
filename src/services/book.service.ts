import api from '../api/axios';
import { toNumber } from '../lib/format';
import type { Book, BookAuthorResponse, BookCategoryResponse, BookCountResponse, BookMutationData, BookPriceResponse, BookQueryParams, BookResponse, BookReview, BookReviewPayload } from '../types/book.types';

const bookService = {
    getBooks: async (params?: BookQueryParams): Promise<BookResponse> => {
        const query = Object.fromEntries(
            Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
        );

        const response = await api.get<BookResponse>('/books', { params: query });
        return response.data;
    },
    // GET /books/{id}. The API sends price/stock/rating as strings ("19.99"); normalise here.
    getBook: async (bookId: number | string): Promise<Book> => {
        const response = await api.get<{ status: string; data: Book }>(`/books/${bookId}`);
        const book = response.data.data;
        return {
            ...book,
            id: toNumber(book.id),
            price: toNumber(book.price),
            stock: book.stock === undefined || book.stock === null ? undefined : toNumber(book.stock),
            average_rating: toNumber(book.average_rating),
            review_count: toNumber(book.review_count),
        };
    },

    getAuthors: async (): Promise<BookAuthorResponse> => {
        const response = await api.get<BookAuthorResponse>('/authors');
        return response.data;
    },
    getBookCategories: async (): Promise<BookCategoryResponse> => {
        const response = await api.get<BookCategoryResponse>('/bookcategory');
        return response.data;
    },
    getBookPrice: async (): Promise<BookPriceResponse> => {
        const response = await api.get<BookPriceResponse>('/bookprice');
        return response.data;
    },
    getBookCount: async (): Promise<BookCountResponse> => {
        const response = await api.get<BookCountResponse>('/books/countbook');
        return response.data;
    },
    getNewArrivals: async (): Promise<BookResponse> => {
        const response = await api.get<BookResponse>('/books/new-arrivals');
        return response.data;
    },
    getBestSellers: async (): Promise<BookResponse> => {
        const response = await api.get<BookResponse>('/books/best-sellers');
        return response.data;
    },
    getBookReviews: async (bookId: number): Promise<BookReview[]> => {
        const response = await api.get<{ status: string; data: BookReview[] }>(`/books/${bookId}/reviews`);
        return response.data.data;
    },
    submitBookReview: async (bookId: number, payload: BookReviewPayload): Promise<BookReview> => {
        const response = await api.post<{ status: string; data: BookReview }>(`/books/${bookId}/reviews`, payload);
        return response.data.data;
    },
    createBook: async (payload: BookMutationData): Promise<Book> => {
        const response = await api.post<{ status: string; data: Book }>('/books', payload);
        return response.data.data;
    },
    updateBook: async (bookId: number, payload: BookMutationData): Promise<Book> => {
        const response = await api.put<{ status: string; data: Book }>(`/books/${bookId}`, payload);
        return response.data.data;
    },
    deleteBook: async (bookId: number): Promise<void> => {
        await api.delete(`/books/${bookId}`);
    }
};

export default bookService;





