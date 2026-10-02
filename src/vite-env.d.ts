/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Bookly API base URL including /api/v1. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
