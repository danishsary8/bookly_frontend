import React from "react";
import { m } from "motion/react";

const Loading: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20"
    >
      {/* Outer rotating ring */}
      <m.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="relative w-12 h-12"
      >
        <div className="absolute inset-0 border-4 border-transparent border-t-primary border-r-primary/50 rounded-full" />
      </m.div>

      {/* Inner pulsing dot */}
      <m.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-3 h-3 bg-primary rounded-full"
      />

      {/* Loading text with typing animation */}
      <m.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mt-6 text-sm text-muted-foreground font-medium"
      >
        {message}
        <m.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="ml-1"
        >
          .
        </m.span>
        <m.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="ml-0.5"
        >
          .
        </m.span>
        <m.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          className="ml-0.5"
        >
          .
        </m.span>
      </m.p>
    </m.div>
  );
};

export default Loading;
