import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle size visualization, opt-in via `ANALYZE=true npm run build`.
    // Only active for production builds (never the dev server), and only
    // when explicitly requested, so it has zero effect on normal dev/build.
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/stats.html',
        title: 'PrismNote frontend bundle',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
  ],
  optimizeDeps: {
    include: ['@reduxjs/toolkit', 'react-redux'],
  },
  server: {
    // Proxy API + WebSocket calls to the PrismNote Rust backend (port 8000),
    // so cell execution, terminal, search, connectors, etc. work from the dev
    // server instead of 404-ing against Vite.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
