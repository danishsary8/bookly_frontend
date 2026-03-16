import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import bookService from "../services/book.service";
import type { Book } from "../types/book.types";

const bgColors = [
  "bg-blue-500/20",
  "bg-rose-500/20",
  "bg-amber-500/20",
  "bg-violet-500/20",
];

const LatestArrivals = () => {
  const [arrivals, setArrivals] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArrivals = async () => {
      try {
        setLoading(true);
        const response = await bookService.getBooks();
        if (response.status === "success") {
          // Assuming latest arrivals are the most recently added books
          setArrivals(response.data.slice(-4).reverse());
        } else {
          setError("Failed to fetch arrivals");
        }
      } catch (err) {
        setError("An error occurred while fetching arrivals");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArrivals();
  }, []);

  return (
    <section id="arrivals" className="py-24 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-4xl md:text-5xl font-bold text-foreground mb-16"
        >
          LATEST <span className="text-primary">ARRIVALS</span>
        </motion.h2>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 font-body border border-red-200 rounded-xl bg-red-50">
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {arrivals.map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                {/* Image with colored bg */}
                <div className={`relative rounded-2xl overflow-hidden aspect-square mb-4 ${bgColors[i % bgColors.length]}`}>
                  <img
                    src={book.book_img}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                </div>

                <h3 className="font-display text-base font-bold text-foreground mb-1 line-clamp-1">{book.title}</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-body font-bold text-foreground">${Number(book.price).toFixed(2)}</span>
                
                </div>
                <button className="w-full border border-border text-foreground py-2 font-body text-xs font-semibold uppercase tracking-wider rounded-full hover:border-primary hover:text-primary transition-colors">
                  View Details
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestArrivals;
