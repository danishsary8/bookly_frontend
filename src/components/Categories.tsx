import { motion } from "framer-motion";
import { BookOpen, Headphones, Sparkles, Globe, Pen, Heart } from "lucide-react";

const categories = [
  { icon: BookOpen, label: "Fiction", count: 2340 },
  { icon: Pen, label: "Non-Fiction", count: 1820 },
  { icon: Sparkles, label: "Sci-Fi & Fantasy", count: 980 },
  { icon: Heart, label: "Romance", count: 1450 },
  { icon: Globe, label: "Travel", count: 670 },
  { icon: Headphones, label: "Audiobooks", count: 3200 },
];

const Categories = () => {
  return (
    <section id="categories" className="py-24 md:py-32 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl md:text-5xl font-bold text-foreground"
          >
            BROWSE BY <span className="text-primary">GENRE</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="flex flex-col items-center gap-3 p-6 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group"
            >
              <cat.icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-display text-base font-semibold text-foreground">{cat.label}</span>
              <span className="font-body text-xs text-muted-foreground">{cat.count.toLocaleString()} books</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
