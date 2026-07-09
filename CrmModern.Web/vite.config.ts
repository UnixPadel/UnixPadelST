import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { version as appVersion } from './package.json'

export default defineConfig({
  // Electron file:// protokolü mutlak yolları çözemediği için relative base
  // şart. Dev server ('/' base) kendi başına çalışır, prod build './' ile asset
  // referanslarını "./assets/..." şekline çevirir.
  base: './',
  // Sol alt köşede gösterilecek güncel sürüm — package.json'dan derleme anında gömülür.
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    hmr: false,
    watch: {
      usePolling: false,
    },
  },
})
