import { motion } from "motion/react";
import { ArrowRight, Play, Sparkles } from "lucide-react";
const heroImage = "https://i.pinimg.com/736x/e6/3d/95/e63d955fc9097f105fb75909432bc613.jpg";

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const Hero = () => {
  return (
    <section className="relative w-full flex items-center overflow-hidden bg-background pt-20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/15 rounded-full blur-3xl"
        />
      </div>

      <div className="w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              <span className="text-xs font-semibold tracking-[0.15em] text-accent uppercase">
                Premium Collection
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] mb-4"
            >
              <span className="text-primary">BIBLION'S</span>
              <br />
              <span className="text-foreground">PREMIUM</span>
              <br />
              <span className="text-foreground">COLLECTION 2026</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-muted-foreground font-body text-lg max-w-md mb-10 leading-relaxed"
            >
              Discover handpicked editions from the world&apos;s finest authors. Every book tells a story — find yours.
            </motion.p>

            <motion.div
              variants={containerVariants}
              className="flex flex-wrap items-center gap-4"
            >
              <motion.a
                variants={itemVariants}
                href="#featured"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 font-body font-bold text-sm uppercase tracking-wider hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 rounded-full group"
              >
                Shop Now
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.a>
              <motion.button
                variants={itemVariants}
                className="inline-flex items-center gap-2 text-foreground font-body font-semibold text-sm hover:text-primary transition-colors group"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary text-primary group-hover:bg-primary/10 transition-colors">
                  <Play className="h-4 w-4 ml-0.5" />
                </span>
                Watch Video
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center"
          >
            <motion.div
              animate={{
                y: [0, -12, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-80 h-80 md:w-[420px] md:h-[420px] rounded-full overflow-hidden border-4 border-border shadow-2xl shadow-primary/20"
            >
              <img
                src={heroImage}
                alt="Premium book collection"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
              
              {/* Floating particles */}
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-4 right-4 h-2 w-2 bg-accent rounded-full"
              />
              <motion.div
                animate={{
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                className="absolute bottom-8 left-6 h-1.5 w-1.5 bg-primary rounded-full"
              />
            </motion.div>

            {/* Floating badge with enhanced animation */}
            <motion.div
              animate={{
                y: [0, -12, 0],
                rotate: [0, 2, 0, -2, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-2 right-8 md:right-12 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-body font-bold text-sm shadow-lg shadow-primary/30"
            >
              📚 2026 Edition
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
