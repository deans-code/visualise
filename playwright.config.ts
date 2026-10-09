import { defineConfig } from '@playwright/test'

// The end-to-end run serves the production build (the same static files GitHub Pages serves, under the same
// base path) on its own port, so it never reuses a dev server. There is no API server: the app runs in the browser.
const WEB_PORT = 5273
const BASE_PATH = '/visualise/'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    // The trailing slash matters: pages are opened with relative paths such as './'.
    baseURL: `http://localhost:${WEB_PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${WEB_PORT} --strictPort`,
    url: `http://localhost:${WEB_PORT}${BASE_PATH}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
