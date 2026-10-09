import { mkdirSync } from 'node:fs'
import { buildApp } from './app'
import { openDb } from './db'
import { loadCatalogueFile, seedCatalogue } from './dictionary'
import { ensureEmbeddings, loadLocalEmbedder, type Embedder } from './embeddings'

const dbPath = process.env.DB_PATH ?? 'data/profiles.db'
if (dbPath !== ':memory:') mkdirSync('data', { recursive: true })

const db = openDb(dbPath)
const catalogue = loadCatalogueFile(process.env.CATALOGUE_FILE ?? 'catalogue/catalogue.json')
if (catalogue) {
  const { added, updated } = seedCatalogue(db, catalogue)
  console.log(`Catalogue: ${added} terms added, ${updated} refreshed`)
} else {
  console.warn('No catalogue found. Run `npm run import-catalogue` to seed the dictionary.')
}

// The model loads in the background so the API is usable straight away; until then relatedness is hierarchy-only.
const embedderRef: { current: Embedder | null } = { current: null }
const app = buildApp(db, {
  get embedder() {
    return embedderRef.current
  },
})
void loadLocalEmbedder().then(async (embedder) => {
  if (!embedder) return
  embedderRef.current = embedder
  const n = await ensureEmbeddings(db, embedder)
  console.log(`Embeddings ready (${n} computed)`)
})
const port = Number(process.env.PORT ?? 3001)

app.listen({ port, host: '127.0.0.1' }).then(() => {
  console.log(`API listening on http://127.0.0.1:${port}`)
})
