/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
