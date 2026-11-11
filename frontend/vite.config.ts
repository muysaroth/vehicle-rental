import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const API = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8090'

export default defineConfig(({ command }) => ({
  // Built into Laravel's public/build and served under /app (routes/web.php).
  base: command === 'build' ? '/build/' : '/',

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  build: {
    outDir: fileURLToPath(new URL('../backend/public/build', import.meta.url)),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    // The browser only ever talks to one origin; Vite forwards /api to Laravel.
    proxy: { '/api': { target: API, changeOrigin: true } },
  },
}))
