/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL REST API бэкенда (по умолчанию http://localhost:8000). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
