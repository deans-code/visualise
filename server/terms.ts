import type { FastifyInstance } from 'fastify'
import { suggestPlacement } from './placement'
import { addAlias, suggestMatches, TermNotFoundError, type TermKind, type TermRow } from './dictionary'

const publicTerm = (t: TermRow & { individuals?: number }) => ({
  id: t.id,
  name: t.canonical,
  kind: t.kind,
  section: t.section,
  category: t.category,
  definition: t.definition,
  sourceUrl: t.source_url,
  status: t.status,
  builtin: !!t.builtin,
  individuals: t.individuals ?? 0,
})

export function registerTermRoutes(app: FastifyInstance) {
  const db = app.db

  app.get('/api/terms', async (req) => {
    const { q, kind, status } = req.query as { q?: string; kind?: string; status?: string }
    const rows = db
      .prepare(
        `SELECT t.*, (SELECT COUNT(DISTINCT individual_id) FROM individual_term WHERE term_id = t.id) AS individuals
         FROM term t
         WHERE (?1 IS NULL OR t.kind = ?1) AND (?2 IS NULL OR t.status = ?2)
           AND (?3 IS NULL OR t.canonical LIKE '%' || ?3 || '%' COLLATE NOCASE
                OR t.category LIKE '%' || ?3 || '%' COLLATE NOCASE
                OR t.definition LIKE '%' || ?3 || '%' COLLATE NOCASE
                OR EXISTS (SELECT 1 FROM term_alias a WHERE a.term_id = t.id AND a.alias LIKE '%' || ?3 || '%' COLLATE NOCASE))
         ORDER BY t.kind, t.category, t.canonical COLLATE NOCASE`,
      )
      .all(kind ?? null, status ?? null, q?.trim() || null) as unknown as (TermRow & { individuals: number })[]
    return rows.map(publicTerm)
  })

  app.get('/api/terms/suggest', async (req, reply) => {
    const { term, kind } = req.query as { term?: string; kind?: string }
    if (!term || (kind !== 'value' && kind !== 'skill')) return reply.code(400).send({ error: 'term and kind required' })
    return suggestMatches(db, kind as TermKind, term).map((s) => ({
      term: publicTerm(s.term),
      score: s.score,
      reason: s.reason,
    }))
  })

  app.post('/api/terms/placement', async (req, reply) => {
    const b = (req.body ?? {}) as { name?: unknown; kind?: unknown; definition?: unknown }
    if (typeof b.name !== 'string' || !b.name.trim() || (b.kind !== 'value' && b.kind !== 'skill')) {
      return reply.code(400).send({ error: 'name and kind are required' })
    }
    if (!app.embedder) return reply.code(503).send({ error: 'Placement is unavailable: no embedding model loaded' })
    const definition = typeof b.definition === 'string' && b.definition.trim() ? b.definition.trim() : null
    const placement = await suggestPlacement(db, app.embedder, { name: b.name.trim(), kind: b.kind, definition })
    return placement ?? reply.code(404).send({ error: 'No catalogue terms to compare with' })
  })

  app.post('/api/terms/:id/aliases', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const alias = (req.body as { alias?: unknown } | undefined)?.alias
    if (typeof alias !== 'string' || !alias.trim()) return reply.code(400).send({ error: 'alias is required' })
    try {
      addAlias(db, id, alias)
    } catch (e) {
      if (e instanceof TermNotFoundError) return reply.code(404).send({ error: 'Not found' })
      throw e
    }
    return reply.code(204).send()
  })

  app.patch('/api/terms/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const b = (req.body ?? {}) as { definition?: unknown; category?: unknown; section?: unknown; sourceUrl?: unknown }
    const row = db.prepare('SELECT * FROM term WHERE id = ?').get(id) as TermRow | undefined
    if (!row) return reply.code(404).send({ error: 'Not found' })
    const definition = typeof b.definition === 'string' ? b.definition.trim() || null : row.definition
    const category = typeof b.category === 'string' ? b.category.trim() || null : row.category
    const section = typeof b.section === 'string' ? b.section.trim() || null : row.section
    const source = typeof b.sourceUrl === 'string' ? b.sourceUrl.trim() || null : row.source_url
    db.prepare('UPDATE term SET definition = ?, category = ?, section = ?, source_url = ?, status = ?, embedding = NULL WHERE id = ?').run(
      definition,
      category,
      section,
      source,
      definition ? 'confirmed' : 'undefined',
      id,
    )
    return publicTerm(db.prepare('SELECT * FROM term WHERE id = ?').get(id) as unknown as TermRow)
  })

  app.delete('/api/terms/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const info = db.prepare('DELETE FROM term WHERE id = ?').run(id)
    if (info.changes === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })
}
