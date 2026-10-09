import { embeddingKey, type BuiltinEmbeddings } from './builtin-embeddings'
import type { Db } from './db'

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>
}

export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'

/**
 * Local sentence-embedding model via transformers.js, loaded lazily on first use.
 * Resolves to null when the optional dependency or model cannot be loaded, in which case
 * callers fall back to hierarchy-only relatedness.
 */
export async function loadLocalEmbedder(): Promise<Embedder | null> {
  try {
    const { pipeline } = await import('@huggingface/transformers')
    const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL)
    return {
      async embed(texts) {
        const out = await extractor(texts, { pooling: 'mean', normalize: true })
        return out.tolist() as number[][]
      },
    }
  } catch (e) {
    console.warn(`Embedding model unavailable (${(e as Error).message}); using hierarchy-only relatedness.`)
    return null
  }
}

export const termText = (name: string, definition: string | null) => (definition ? `${name}: ${definition}` : name)

export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

/**
 * Compute and cache the embedding of every term that lacks one. Returns how many were computed.
 * `customOnly` skips built-in terms (their vectors ship with the catalogue) and custom terms with no definition
 * yet (a bare name embeds too poorly to relate anything).
 */
export async function ensureEmbeddings(db: Db, embedder: Embedder, options: { customOnly?: boolean; batchSize?: number } = {}): Promise<number> {
  const batchSize = options.batchSize ?? 64
  const rows = db
    .prepare(
      `SELECT id, canonical, definition FROM term WHERE embedding IS NULL${
        options.customOnly ? ' AND builtin = 0 AND definition IS NOT NULL' : ''
      }`,
    )
    .all() as unknown as { id: number; canonical: string; definition: string | null }[]
  const update = db.prepare('UPDATE term SET embedding = ? WHERE id = ?')
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const vectors = await embedder.embed(batch.map((r) => termText(r.canonical, r.definition)))
    batch.forEach((r, j) => update.run(JSON.stringify(vectors[j]), r.id))
  }
  return rows.length
}

/**
 * Every known vector by term id. Built-in terms use the vectors shipped with the catalogue (so no model is needed
 * for them); custom terms use the ones computed in the browser and stored in the database.
 */
export function loadEmbeddings(db: Db, builtin?: BuiltinEmbeddings): Map<number, number[]> {
  const out = new Map<number, number[]>()
  if (builtin && builtin.size > 0) {
    const rows = db.prepare('SELECT id, kind, canonical FROM term WHERE builtin = 1').all() as unknown as {
      id: number
      kind: string
      canonical: string
    }[]
    for (const r of rows) {
      const v = builtin.get(embeddingKey(r.kind, r.canonical))
      if (v) out.set(r.id, v)
    }
  }
  const stored = db.prepare('SELECT id, embedding FROM term WHERE embedding IS NOT NULL').all() as unknown as {
    id: number
    embedding: string
  }[]
  for (const r of stored) out.set(r.id, JSON.parse(r.embedding) as number[])
  return out
}
