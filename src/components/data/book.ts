
export interface StaticBook {
    id: number;
    title: string;
    author: string;
    price: number;
    book_img: string;
    genre: string;
    published_date?: string;
    pages?: number;
    rating?: number;
    featured?: boolean;
}

export const books: StaticBook[] = [
    { id: 1, title: "1984", author: "George Orwell", price: 19.99, book_img: "https://www.penguin.co.uk/_next/image?url=https%3A%2F%2Fcdn.penguin.co.uk%2Fdam-assets%2Fbooks%2F9780141036144%2F9780141036144-jacket-large.jpg&w=614&q=100", genre: "Science Fiction", published_date: "1949-06-08", pages: 328, rating: 4.8, featured: true },
    { id: 2, title: "Pride and Prejudice", author: "Jane Austen", price: 14.99, book_img: "https://readaloudrevival.com/wp-content/uploads/2016/05/Pride-and-Prejudice.png.webp", genre: "Romance", published_date: "1813-01-28", pages: 432, rating: 4.7 },
    { id: 3, title: "The Hobbit", author: "J.R.R. Tolkien", price: 17.99, book_img: "https://yesterdaysmuse.cdn.bibliopolis.com/pictures/2341696.jpg?auto=webp&v=1768253579", genre: "Fantasy", published_date: "1937-09-21", pages: 310, rating: 4.9 },
    { id: 4, title: "Murder on the Orient Express", author: "Agatha Christie", price: 15.99, book_img: "https://yesterdaysmuse.cdn.bibliopolis.com/pictures/2347588.jpg?width=768&height=1000&fit=bounds&auto=webp&v=1738102712", genre: "Mystery", published_date: "1934-01-01", pages: 256, rating: 4.6 },
    { id: 5, title: "Dune", author: "Frank Herbert", price: 21.5, book_img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1434908555i/44767458.jpg", genre: "Science Fiction", published_date: "1965-08-01", pages: 688, rating: 4.8 },
    { id: 6, title: "Atomic Habits", author: "James Clear", price: 18.5, book_img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg", genre: "Self-Help", published_date: "2018-10-16", pages: 320, rating: 4.9 },
    { id: 7, title: "The Da Vinci Code", author: "Dan Brown", price: 16.99, book_img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1724865710i/968.jpg", genre: "Thriller", published_date: "2003-03-18", pages: 597, rating: 4.5 },
    { id: 8, title: "The C++ Programming Language", author: "Bjarne Stroustrup", price: 44.99, book_img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1386922270i/799182.jpg", genre: "Programming", published_date: "2013-05-19", pages: 1376, rating: 4.7 },
];
