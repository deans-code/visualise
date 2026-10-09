/**
 * Computes the sentence embedding of every catalogue term once, at build time, and writes
 *   public/catalogue/embeddings.json   (model, dimensions, count, fingerprint of the catalogue it belongs to)
 *   public/catalogue/embeddings.bin    (float32 vectors, one row per catalogue term, in catalogue order)
 *
 * so the hosted site can relate built-in terms immediately, without downloading a language model.
 *
 *   npm run embed-catalogue
 *
 * `npm run import-catalogue` runs this automatically after refreshing the catalogue. The model is downloaded on
 * first use (about 25 MB) and cached by the transformers library.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { packEmbeddings, type EmbeddingsMeta } from '../core/builtin-embeddings'
import { fingerprintOf } from '../core/dictionary'
import { EMBEDDING_MODEL, loadLocalEmbedder, termText } from '../core/embeddings'
import type { Catalogue } from '../shared/catalogue'

export async function embedCatalogue(dir = resolve('public/catalogue')) {
  const text = readFileSync(resolve(dir, 'catalogue.json'), 'utf-8')
  const catalogue = JSON.parse(text) as Catalogue
  const embedder = await loadLocalEmbedder()
  if (!embedder) throw new Error('The embedding model could not be loaded, so no embeddings were written.')

  const vectors: number[][] = []
  const BATCH = 32
  for (let i = 0; i < catalogue.terms.length; i += BATCH) {
    const batch = catalogue.terms.slice(i, i + BATCH)
    vectors.push(...(await embedder.embed(batch.map((t) => termText(t.name, t.definition)))))
    process.stdout.write(`\rEmbedded ${Math.min(i + BATCH, catalogue.terms.length)} of ${catalogue.terms.length}`)
  }
  process.stdout.write('\n')

  const { meta, bytes } = packEmbeddings(vectors)
  const full: EmbeddingsMeta = { model: EMBEDDING_MODEL, ...meta, catalogue: fingerprintOf(text) }
  writeFileSync(resolve(dir, 'embeddings.bin'), bytes)
  writeFileSync(resolve(dir, 'embeddings.json'), JSON.stringify(full, null, 2) + '\n')
  console.log(`Wrote ${meta.count} embeddings of ${meta.dims} dimensions (${(bytes.length / 1024).toFixed(0)} KB).`)
}

// Run directly (not when imported by the import script).
if (process.argv[1] && resolve(process.argv[1]).endsWith('embed-catalogue.ts')) {
  await embedCatalogue()
}
