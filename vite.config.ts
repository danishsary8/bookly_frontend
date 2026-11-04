/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { seo } from "./scripts/seo";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd()), ...process.env };
  // Error reports name the deployed commit; with SENTRY_AUTH_TOKEN the build also uploads source maps
  // (then deletes them from dist), so stack traces point at real files and lines.
  const release = env.VERCEL_GIT_COMMIT_SHA ?? "";
  const uploadSourceMaps = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT);
  return {
    define: {
      "import.meta.env.VITE_RELEASE": JSON.stringify(release),
      // Vercel sets VERCEL=1 while it builds; visitor statistics only load on those builds (VisitorAnalytics).
      "import.meta.env.VITE_ON_VERCEL": JSON.stringify(Boolean(env.VERCEL)),
    },
    plugins: [
      react(),
      seo({ siteUrl: env.VITE_SITE_URL, apiUrl: env.VITE_API_BASE_URL }),
      uploadSourceMaps &&
        sentryVitePlugin({
          authToken: env.SENTRY_AUTH_TOKEN,
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          release: release ? { name: release } : undefined,
          sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
          telemetry: false,
        }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: uploadSourceMaps ? "hidden" : false,
      // Never inline font files into the CSS: every page would download all of them, even subsets it never shows.
      assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
      rollupOptions: {
        output: {
          // Merge chunks under ~2 kB (single icons, small helpers) into the chunks that load with them, so a page
          // needs a few requests instead of dozens of tiny ones.
          experimentalMinChunkSize: 2_000,
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
