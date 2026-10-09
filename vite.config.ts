/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * transformers.js bundles a 27 MB copy of the ONNX runtime's WebAssembly, but at run time it fetches the runtime
 * from jsDelivr (see the privacy note), so the copy is never used. Leaving it out keeps the deployed site small.
 */
const dropUnusedOnnxWasm = (): Plugin => ({
  name: 'drop-unused-onnx-wasm',
  apply: 'build',
  generateBundle(_options, bundle) {
    for (const file of Object.keys(bundle)) if (/ort-wasm.*\.wasm$/.test(file)) delete bundle[file]
  },
})

// GitHub Pages serves a project site from /<repo>/. Set VITE_BASE=/ to serve from a domain root instead.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/visualise/',
  plugins: [react(), dropUnusedOnnxWasm()],
  worker: { format: 'es' },
  test: {
    globals: true,
    environment: 'node',
    // component tests opt in with `// @vitest-environment jsdom`
    setupFiles: ['./src/test-setup.ts'],
    // e2e/ is Playwright's, run with `npm run test:e2e`.
    include: ['src/**/*.test.{ts,tsx}', 'core/**/*.test.ts', 'shared/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
