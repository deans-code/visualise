import type { BuiltinEmbeddings } from './builtin-embeddings'
import type { Db } from './db'
import { cosine, loadEmbeddings, termText, type Embedder } from './embeddings'
import type { TermKind } from './dictionary'

export interface Placement {
  section: string | null
  category: string
  /** Share of the nearest-neighbour vote that went to the winning category, 0..1. */
  confidence: number
  neighbours: { name: string; category: string; similarity: number }[]
}

const NEIGHBOURS = 5

/**
 * Suggest a section and category for a custom term from its nearest catalogue terms by definition
 * similarity. The caller shows this to the user, who confirms or changes it.
 */
export async function suggestPlacement(
  db: Db,
  embedder: Embedder,
  term: { name: string; kind: TermKind; definition: string | null },
  builtin?: BuiltinEmbeddings,
): Promise<Placement | null> {
  const [vector] = await embedder.embed([termText(term.name, term.definition)])
  const vectors = loadEmbeddings(db, builtin)
  const catalogue = db
    .prepare('SELECT id, canonical, section, category FROM term WHERE builtin = 1 AND kind = ? AND category IS NOT NULL')
    .all(term.kind) as unknown as { id: number; canonical: string; section: string | null; category: string }[]

  const ranked = catalogue
    .flatMap((t) => {
      const v = vectors.get(t.id)
      return v ? [{ ...t, similarity: cosine(vector, v) }] : []
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, NEIGHBOURS)
  if (ranked.length === 0) return null

  const votes = new Map<string, { weight: number; section: string | null }>()
  for (const n of ranked) {
    const key = n.category
    const w = Math.max(n.similarity, 0)
    votes.set(key, { weight: (votes.get(key)?.weight ?? 0) + w, section: n.section })
  }
  const total = [...votes.values()].reduce((s, v) => s + v.weight, 0)
  const [category, win] = [...votes.entries()].sort((a, b) => b[1].weight - a[1].weight)[0]

  return {
    section: win.section,
    category,
    confidence: total ? win.weight / total : 0,
    neighbours: ranked.map((n) => ({ name: n.canonical, category: n.category, similarity: n.similarity })),
  }
}
