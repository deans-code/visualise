import { normaliseTerm } from '../shared/normalise'
import type { Catalogue } from '../shared/catalogue'

/** Describes `embeddings.bin`, which sits beside the catalogue and holds one vector per catalogue term, in order. */
export interface EmbeddingsMeta {
  model: string
  dims: number
  count: number
  /** Fingerprint of the catalogue text the vectors were computed from; a mismatch means they are stale. */
  catalogue: string
}

/** Built-in term vectors, keyed `kind:normalised name` so they can be matched to dictionary rows. */
export type BuiltinEmbeddings = Map<string, number[]>

export const embeddingKey = (kind: string, name: string) => `${kind}:${normaliseTerm(name)}`

/** Pack vectors into the binary file: float32, row after row, in catalogue order. */
export function packEmbeddings(vectors: number[][]): { meta: Pick<EmbeddingsMeta, 'dims' | 'count'>; bytes: Uint8Array } {
  const dims = vectors[0]?.length ?? 0
  const flat = new Float32Array(vectors.length * dims)
  vectors.forEach((v, i) => {
    if (v.length !== dims) throw new Error(`Vector ${i} has ${v.length} dimensions, expected ${dims}`)
    flat.set(v, i * dims)
  })
  return { meta: { dims, count: vectors.length }, bytes: new Uint8Array(flat.buffer) }
}

/**
 * Read the shipped vectors. Throws, with the reason, if they do not belong to this catalogue, because relatedness
 * computed from the wrong vectors would be silently wrong; the caller falls back to catalogue position instead.
 */
export function parseEmbeddings(
  meta: EmbeddingsMeta,
  buffer: ArrayBuffer,
  catalogue: Catalogue,
  fingerprint: string,
): BuiltinEmbeddings {
  if (meta.catalogue !== fingerprint) throw new Error('The shipped embeddings were computed from a different catalogue')
  if (meta.count !== catalogue.terms.length) throw new Error(`Expected ${catalogue.terms.length} embeddings, found ${meta.count}`)
  if (buffer.byteLength !== meta.count * meta.dims * 4) throw new Error('The embeddings file is the wrong size')
  const flat = new Float32Array(buffer)
  const out: BuiltinEmbeddings = new Map()
  catalogue.terms.forEach((t, i) => out.set(embeddingKey(t.kind, t.name), Array.from(flat.subarray(i * meta.dims, (i + 1) * meta.dims))))
  return out
}
