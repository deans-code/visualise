import type { FastifyInstance } from 'fastify'
import type { GraphData, GraphTerm, Role } from '../shared/graph'
import { relatedness } from '../shared/relatedness'
import type { Db } from './db'
import { cosine, loadEmbeddings } from './embeddings'

/**
 * Weakest relatedness worth reporting. With definition embeddings, "same section" alone (about 0.3 for
 * unrelated definitions) must not link people, and 0.35 still left a typical term with dozens of partners, so the
 * bar sits at 0.5: a shared category, or clearly similar definitions. Without embeddings only a shared
 * category clears the bar, since a same-section score of 0.5 would link every technical person to every other.
 */
const MIN_WITH_EMBEDDINGS = 0.5
const MIN_HIERARCHY_ONLY = 0.9

export function buildGraph(db: Db): GraphData {
  const people = db.prepare('SELECT id, name FROM individual ORDER BY name COLLATE NOCASE').all() as unknown as GraphData['people']
  const links = db
    .prepare('SELECT individual_id AS person, term_id AS term, role FROM individual_term')
    .all() as unknown as { person: number; term: number; role: Role }[]

  const terms = db
    .prepare(
      `SELECT DISTINCT t.id, t.canonical AS name, t.kind, t.section, t.category, t.definition
       FROM term t JOIN individual_term it ON it.term_id = t.id ORDER BY t.id`,
    )
    .all() as unknown as GraphTerm[]

  const embeddings = loadEmbeddings(db)
  const related: GraphData['related'] = []
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      const a = terms[i]
      const b = terms[j]
      const va = embeddings.get(a.id)
      const vb = embeddings.get(b.id)
      const blended = va && vb
      const r = relatedness(a, b, blended ? cosine(va, vb) : undefined)
      if (r.score >= (blended ? MIN_WITH_EMBEDDINGS : MIN_HIERARCHY_ONLY)) {
        related.push({ a: a.id, b: b.id, score: Math.round(r.score * 1000) / 1000, reasons: r.reasons })
      }
    }
  }
  return { people, terms, links, related }
}

export function registerGraphRoutes(app: FastifyInstance) {
  app.get('/api/graph', async () => buildGraph(app.db))
}
