/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Bookly API base URL including /api/v1. */
  readonly VITE_API_BASE_URL?: string;
  /** "staging" on the staging site: shows the staging bar and labels Sentry reports. */
  readonly VITE_APP_ENV?: string;
  /** True on builds made by Vercel (set in vite.config.ts); visitor statistics only load there. */
  readonly VITE_ON_VERCEL?: boolean;
  /** Google Maps browser key (locked to the shop address in Google Cloud); empty = no map buttons. */
  readonly VITE_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
