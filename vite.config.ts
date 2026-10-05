/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { seo } from "./scripts/seo";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd()), ...process.env };
  return {
    plugins: [
      react(),
      seo({ siteUrl: env.VITE_SITE_URL, apiUrl: env.VITE_API_BASE_URL }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Libraries every page needs, in their own long-cached files; app code changes don't invalidate them.
          // Motion stays out: its animation features load lazily (LazyMotion in App.tsx).
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (
              /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(
                id,
              )
            )
              return "react";
            if (
              id.includes("node_modules/@tanstack/") ||
              id.includes("node_modules/axios/")
            )
              return "data";
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      exclude: ["e2e/**", "node_modules/**"],
    },
  };
});
