/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Bookly API base URL including /api/v1. */
  readonly VITE_API_BASE_URL?: string;
  /** "staging" on the staging site: shows the staging bar and labels Sentry reports. */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
