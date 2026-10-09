import { defineConfig } from '@playwright/test'

// The e2e run gets its own ports and an in-memory database, so it never touches (or reuses) a dev server and its data.
const API_PORT = 3101
const WEB_PORT = 5273

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx server/index.ts',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { PORT: String(API_PORT), DB_PATH: ':memory:', DISABLE_EMBEDDINGS: '1' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
