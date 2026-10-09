// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const CATALOGUE = {
  version: 1,
  terms: [
    { name: 'React', kind: 'skill', section: 'technical', category: 'Web and frontend', definition: 'A UI library.' },
    { name: 'Trust', kind: 'value', section: null, category: 'Relationships', definition: 'Relying on others.' },
  ],
}
const profile = (name: string) => ({
  name: `${name}.json`,
  text: JSON.stringify({ values: ['Trust'], skills: { technical: { experience: ['React', 'Zig'], desired: [] } } }),
})
const wasmBinary = readFileSync(createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'))

/** A fresh copy of the app's modules, as a page reload would give, sharing only browser storage. */
async function reload() {
  vi.resetModules()
  const { initDatabaseEngine } = await import('../core/db')
  await initDatabaseEngine({ wasmBinary })
  return { engine: await import('./engine'), state: await import('./storage-state'), db: await import('../core/db') }
}

const flushSaves = async () => {
  window.dispatchEvent(new Event('pagehide'))
  await new Promise((r) => setTimeout(r, 20))
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, text: async () => JSON.stringify(CATALOGUE) })),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  indexedDB = new IDBFactory() // each test starts with an empty browser store
})

describe('the in-browser data layer', () => {
  it('seeds the dictionary from the static catalogue on a first visit', async () => {
    const { engine } = await reload()
    const api = await engine.startApi()
    expect((await api.listTerms()).map((t) => t.name).sort()).toEqual(['React', 'Trust'])
    expect(fetch).toHaveBeenCalledWith(`${engine.BASE}catalogue/catalogue.json`)
  })

  it('keeps people, custom terms and confirmed definitions across a reload', async () => {
    const first = await reload()
    const api = await first.engine.startApi()
    const out = await api.upload([profile('alex')])
    const zig = out.unresolved.find((t) => t.name === 'Zig')!
    await api.updateTerm(zig.id, { definition: 'A systems language.' })
    await flushSaves()

    const second = await reload()
    const again = await second.engine.startApi()
    expect((await again.listIndividuals()).map((p) => p.name)).toEqual(['alex'])
    expect((await again.listTerms({ q: 'zig' }))[0]).toMatchObject({ name: 'Zig', definition: 'A systems language.', status: 'confirmed' })
    // The catalogue is not seeded again, and the saved terms are not duplicated.
    expect((await again.listTerms()).filter((t) => t.name === 'React')).toHaveLength(1)
  })

  it('starts empty in a different browser (a store with nothing in it)', async () => {
    const first = await reload()
    await (await first.engine.startApi()).upload([profile('alex')])
    await flushSaves()

    indexedDB = new IDBFactory()
    const other = await reload()
    expect(await (await other.engine.startApi()).listIndividuals()).toEqual([])
  })

  it('after Clear all data a reload shows the same empty state', async () => {
    const first = await reload()
    const api = await first.engine.startApi()
    await api.upload([profile('alex')])
    await flushSaves()
    await api.clearAll()
    await flushSaves()

    const second = await reload()
    const again = await second.engine.startApi()
    expect(await again.listIndividuals()).toEqual([])
    expect((await again.listTerms()).map((t) => t.name).sort()).toEqual(['React', 'Trust'])
  })

  it('picks up a newer copy saved by another tab when this tab is shown again', async () => {
    const { engine, state, db } = await reload()
    const api = await engine.startApi()
    const replaced = vi.fn()
    window.addEventListener(state.DATA_REPLACED, replaced)

    // Another tab saves a database with a person in it.
    const other = db.openDb()
    other.prepare('INSERT INTO individual (name) VALUES (?)').run('from-another-tab')
    const { indexedDbStore } = await import('../core/persistence')
    await indexedDbStore().write({ bytes: other.export(), version: 50 })

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 20))

    expect((await api.listIndividuals()).map((p) => p.name)).toEqual(['from-another-tab'])
    expect(replaced).toHaveBeenCalled()
  })

  it('keeps working from memory, and says so, when browser storage is unavailable', async () => {
    const real = globalThis.indexedDB
    // @ts-expect-error simulating a browser with no IndexedDB
    delete globalThis.indexedDB
    try {
      const { engine, state } = await reload()
      const api = await engine.startApi()
      await api.upload([profile('alex')])
      expect(await api.listIndividuals()).toHaveLength(1)
      expect(state.getSaveState()).toMatchObject({ kind: 'memory-only' })
    } finally {
      globalThis.indexedDB = real
    }
  })

  it('works without the catalogue, with a warning, if it cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { engine } = await reload()
    expect(await (await engine.startApi()).listTerms()).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('refuses, with an explanation, in a browser without WebAssembly', async () => {
    vi.stubGlobal('WebAssembly', undefined)
    const { engine } = await reload()
    await expect(engine.startApi()).rejects.toThrow(/cannot run WebAssembly/)
  })
})
