/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKBENCH_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __SITE_UPDATED_AT__: string;
