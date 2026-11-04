/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Bookly API base URL including /api/v1. */
  readonly VITE_API_BASE_URL?: string;
  /** "staging" on the staging site: shows the staging bar and labels Sentry reports. */
  readonly VITE_APP_ENV?: string;
  /** True on builds made by Vercel (set in vite.config.ts); visitor statistics only load there. */
  readonly VITE_ON_VERCEL?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
