import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { initDatabaseEngine } from '../core/db'

// Tests share one SQLite WebAssembly module, read from disk: there is nothing to fetch in Node or jsdom.
await initDatabaseEngine({ wasmBinary: readFileSync(createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')) })

// jsdom has no PointerEvent, so pointer events would arrive without pointerType, pointerId or coordinates.
if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, configurable: true })
}
