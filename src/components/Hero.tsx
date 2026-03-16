import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
const heroImage = "https://i.pinimg.com/736x/e6/3d/95/e63d955fc9097f105fb75909432bc613.jpg";

const Hero = () => {
  return (
    <section className="relative w-full  flex items-center overflow-hidden bg-background pt-20">
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] mb-4"
            >
              <span className="text-primary">BIBLION'S</span>
              <br />
              <span className="text-foreground">PREMIUM</span>
              <br />
              <span className="text-foreground">COLLECTION 2026</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-muted-foreground font-body text-lg max-w-md mb-10 leading-relaxed"
            >
              Discover handpicked editions from the world's finest authors. Every book tells a story — find yours.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap items-center gap-4"
            >
              <a
                href="#featured"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 font-body font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity rounded-full"
              >
                Shop Now
                <ArrowRight className="h-4 w-4" />
              </a>
              <button className="inline-flex items-center gap-2 text-foreground font-body font-semibold text-sm hover:text-primary transition-colors">
                <span className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary text-primary">
                  <Play className="h-4 w-4 ml-0.5" />
                </span>
                Watch Video
              </button>
            </motion.div>
          </div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center"
          >
            <div className="relative w-80 h-80 md:w-[420px] md:h-[420px] rounded-full overflow-hidden border-4 border-border shadow-2xl shadow-primary/10">
              <img
                src={heroImage}
                alt="Premium book collection"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>
            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -bottom-2 right-8 md:right-12 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-body font-bold text-sm shadow-lg"
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
