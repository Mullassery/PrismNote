import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Standalone config for `vitest run` (see `npm test`). Kept separate from
// vite.config.ts so the production build config never has to think about
// test-only concerns (jsdom environment, test globs, etc).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
  },
})
