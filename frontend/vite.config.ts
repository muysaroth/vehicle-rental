import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const API = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8090'

// Vercel sets VERCEL=1 during its builds. There the app is a standalone static
// site in dist/ (vercel.json proxies /api to Laravel); everywhere else it is
// built into Laravel's public/build and served under /app (routes/web.php).
const onVercel = !!process.env.VERCEL

export default defineConfig(({ command }) => ({
  base: command === 'build' && !onVercel ? '/build/' : '/',

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  build: {
    outDir: onVercel ? 'dist' : fileURLToPath(new URL('../backend/public/build', import.meta.url)),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    // The browser only ever talks to one origin; Vite forwards /api to Laravel.
    proxy: { '/api': { target: API, changeOrigin: true } },
  },
}))
