/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3001' },
  },
  test: {
    globals: true,
    environment: 'node',
    // component tests opt in with `// @vitest-environment jsdom`
    setupFiles: ['./src/test-setup.ts'],
    // e2e/ is Playwright's, run with `npm run test:e2e`.
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts', 'shared/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
