import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import BookCard from "./BookCard";
import bookService from "../services/book.service";
import type { Book } from "../types/book.types";

const FeaturedBooks = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const response = await bookService.getBooks();
        if (response.status === "success") {
          setBooks(response.data);
        } else {
          setError("Failed to fetch books");
        }
      } catch (err) {
        setError("An error occurred while fetching books");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return (
    <section id="featured" className="py-24 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-4">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-4xl md:text-5xl font-bold text-foreground"
            >
              POPULAR <span className="text-primary">BOOKS</span>
            </motion.h2>
          </div>
          <motion.a
            href="#"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-primary font-body text-sm font-semibold uppercase tracking-wider hover:opacity-70 transition-opacity"
          >
            View All →
          </motion.a>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 font-body border border-red-200 rounded-xl bg-red-50">
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.slice(0, 6).map((book) => (
              <BookCard
                key={book.id}
                book_img={book.book_img}
                title={book.title}
                author={book.author || "Unknown Author"}
                price={Number(book.price)}
                pages={book.pages}
                // ={book.originalPrice}
                rating={book.rating || 5}
                // badge={book.badge}
                // index={i}
                // id={book.id}
                category={book.category}

              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedBooks;
