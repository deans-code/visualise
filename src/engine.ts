import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { createApi, type Engine } from '../core/api'
import { parseEmbeddings, type BuiltinEmbeddings, type EmbeddingsMeta } from '../core/builtin-embeddings'
import { initDatabaseEngine, openDb } from '../core/db'
import { fingerprintOf, seedIfChanged } from '../core/dictionary'
import { LazyEmbedder } from '../core/embedder-client'
import { indexedDbStore, Persistence } from '../core/persistence'
import type { Api } from '../shared/api'
import type { Catalogue } from '../shared/catalogue'
import { DATA_REPLACED, setSaveState } from './storage-state'

/** Where the site's static files are served from: `/visualise/` on GitHub Pages, `/` elsewhere. */
export const BASE = import.meta.env.BASE_URL

export class UnsupportedBrowserError extends Error {}

async function fetchCatalogue(): Promise<{ catalogue: Catalogue; fingerprint: string } | null> {
  try {
    const res = await fetch(`${BASE}catalogue/catalogue.json`)
    if (!res.ok) return null
    const text = await res.text()
    return { catalogue: JSON.parse(text) as Catalogue, fingerprint: fingerprintOf(text) }
  } catch {
    return null
  }
}

/** The vectors shipped beside the catalogue, or undefined (with a warning) if they are missing or do not match it. */
async function fetchEmbeddings(catalogue: Catalogue, fingerprint: string): Promise<BuiltinEmbeddings | undefined> {
  try {
    const [metaRes, binRes] = await Promise.all([fetch(`${BASE}catalogue/embeddings.json`), fetch(`${BASE}catalogue/embeddings.bin`)])
    if (!metaRes.ok || !binRes.ok) throw new Error('not found')
    return parseEmbeddings((await metaRes.json()) as EmbeddingsMeta, await binRes.arrayBuffer(), catalogue, fingerprint)
  } catch (e) {
    console.warn(`Built-in term embeddings unavailable (${(e as Error).message}); relatedness uses catalogue position only.`)
    return undefined
  }
}

/** Open the database from browser storage, seed the dictionary, and start saving changes. */
export async function startApi(): Promise<Api> {
  if (typeof WebAssembly === 'undefined') {
    throw new UnsupportedBrowserError('This browser cannot run WebAssembly, which the visualiser needs. Please use a current browser.')
  }
  await initDatabaseEngine({ wasmUrl })

  const store = typeof indexedDB === 'undefined' ? null : indexedDbStore()
  const engine: Engine = { db: undefined as never }
  const persistence = new Persistence(store, () => engine.db.export(), { onState: setSaveState })
  engine.changed = () => persistence.schedule()
  // The language model is only needed for custom terms, so the worker (and the download) starts on first use.
  const embedder = new LazyEmbedder(() => new Worker(new URL('./embedder.worker.ts', import.meta.url), { type: 'module' }))
  engine.embedder = () => embedder

  const bytes = await persistence.load()
  engine.db = openDb(bytes ?? undefined)

  const loaded = await fetchCatalogue()
  if (loaded) {
    engine.catalogue = loaded.catalogue
    engine.builtinEmbeddings = await fetchEmbeddings(loaded.catalogue, loaded.fingerprint)
    if (seedIfChanged(engine.db, loaded.catalogue, loaded.fingerprint)) persistence.schedule()
  } else {
    console.warn('The built-in catalogue could not be loaded; the dictionary starts empty.')
  }

  // Save when the tab is hidden or closed, and pick up another tab's newer save when this one is shown again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void persistence.flush()
    else void adoptNewerCopy()
  })
  window.addEventListener('pagehide', () => void persistence.flush())

  async function adoptNewerCopy() {
    const newer = await persistence.newerCopy()
    if (!newer) return
    persistence.stop()
    persistence.adopt(newer)
    engine.db = openDb(newer.bytes)
    window.dispatchEvent(new Event(DATA_REPLACED))
  }

  return createApi(engine)
}
