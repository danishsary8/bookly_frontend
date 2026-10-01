import { motion } from "motion/react";
import { BookOpen, Headphones, Sparkles, Globe, Pen, Heart } from "lucide-react";

const categories = [
  { icon: BookOpen, label: "Fiction", count: 2340 },
  { icon: Pen, label: "Non-Fiction", count: 1820 },
  { icon: Sparkles, label: "Sci-Fi & Fantasy", count: 980 },
  { icon: Heart, label: "Romance", count: 1450 },
  { icon: Globe, label: "Travel", count: 670 },
  { icon: Headphones, label: "Audiobooks", count: 3200 },
];

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const Categories = () => {
  return (
    <section id="categories" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        animate={{
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {categories.map((cat) => (
            <motion.button
              key={cat.label}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center gap-3 p-6 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group"
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <cat.icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.div>
              <span className="font-display text-base font-semibold text-foreground">{cat.label}</span>
              <span className="font-body text-xs text-muted-foreground">{cat.count.toLocaleString()} books</span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Categories;
