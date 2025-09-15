/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_API_URL: string
  readonly VITE_BACKEND_URL: string
  // add other env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
