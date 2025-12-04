/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

interface ImportMetaEnv {
  readonly VITE_GITHUB_OAUTH_URL?: string
  readonly VITE_CORS_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}