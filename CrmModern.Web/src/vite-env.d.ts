/// <reference types="vite/client" />

interface ImportMetaEnv { readonly VITE_API_URL: string }
interface ImportMeta { readonly env: ImportMetaEnv }

// vite.config.ts `define` ile enjekte edilen uygulama sürümü (package.json'dan).
declare const __APP_VERSION__: string
