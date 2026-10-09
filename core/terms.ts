import type { BuiltinEmbeddings } from './builtin-embeddings'
import type { Db } from './db'
import { addAlias, suggestMatches, TermNotFoundError, type TermKind, type TermRow } from './dictionary'
import type { Embedder } from './embeddings'
import { ApiError } from './errors'
import { lookupDefinition, type DefinitionProvider, type LookupOutcome } from './lookup'
import { suggestPlacement, type Placement } from './placement'

export const publicTerm = (t: TermRow & { individuals?: number }) => ({
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

const isKind = (k: unknown): k is TermKind => k === 'value' || k === 'skill'

export function listTerms(db: Db, query: { q?: string; kind?: string; status?: string } = {}) {
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
    .all(query.kind ?? null, query.status ?? null, query.q?.trim() || null) as unknown as (TermRow & { individuals: number })[]
  return rows.map(publicTerm)
}

export function suggestTerms(db: Db, term: unknown, kind: unknown) {
  if (typeof term !== 'string' || !term || !isKind(kind)) throw new ApiError(400, 'term and kind required')
  return suggestMatches(db, kind, term).map((s) => ({ term: publicTerm(s.term), score: s.score, reason: s.reason }))
}

/** Proposes a definition from the web. Read-only: nothing is saved until the user confirms via `updateTerm`. */
export async function lookup(providers: DefinitionProvider[], body: { term?: unknown; kind?: unknown; section?: unknown }): Promise<LookupOutcome> {
  if (typeof body.term !== 'string' || !body.term.trim() || !isKind(body.kind)) {
    throw new ApiError(400, 'term and kind are required')
  }
  return lookupDefinition(providers, {
    term: body.term.trim(),
    kind: body.kind,
    section: typeof body.section === 'string' ? body.section : null,
  })
}

export async function placement(
  db: Db,
  embedder: Embedder | null,
  body: { name?: unknown; kind?: unknown; definition?: unknown },
  builtin?: BuiltinEmbeddings,
): Promise<Placement> {
  if (typeof body.name !== 'string' || !body.name.trim() || !isKind(body.kind)) {
    throw new ApiError(400, 'name and kind are required')
  }
  if (!embedder) throw new ApiError(503, 'Placement is unavailable: no embedding model loaded')
  const definition = typeof body.definition === 'string' && body.definition.trim() ? body.definition.trim() : null
  const found = await suggestPlacement(db, embedder, { name: body.name.trim(), kind: body.kind, definition }, builtin)
  if (!found) throw new ApiError(404, 'No catalogue terms to compare with')
  return found
}

export function addTermAlias(db: Db, id: number, alias: unknown): void {
  if (typeof alias !== 'string' || !alias.trim()) throw new ApiError(400, 'alias is required')
  try {
    addAlias(db, id, alias)
  } catch (e) {
    if (e instanceof TermNotFoundError) throw new ApiError(404, 'Not found')
    throw e
  }
}

export function updateTerm(
  db: Db,
  id: number,
  b: { definition?: unknown; category?: unknown; section?: unknown; sourceUrl?: unknown },
) {
  const row = db.prepare('SELECT * FROM term WHERE id = ?').get(id) as TermRow | undefined
  if (!row) throw new ApiError(404, 'Not found')
  const definition = typeof b.definition === 'string' ? b.definition.trim() || null : row.definition
  const category = typeof b.category === 'string' ? b.category.trim() || null : row.category
  const section = typeof b.section === 'string' ? b.section.trim() || null : row.section
  let source = row.source_url
  if (typeof b.sourceUrl === 'string') {
    source = b.sourceUrl.trim() || null
    // The source is rendered as a link, so only web URLs are allowed (not javascript: and friends).
    if (source && !/^https?:\/\//i.test(source)) throw new ApiError(400, 'sourceUrl must be an http(s) URL')
  }
  db.prepare('UPDATE term SET definition = ?, category = ?, section = ?, source_url = ?, status = ?, embedding = NULL WHERE id = ?').run(
    definition,
    category,
    section,
    source,
    definition ? 'confirmed' : 'undefined',
    id,
  )
  return publicTerm(db.prepare('SELECT * FROM term WHERE id = ?').get(id) as unknown as TermRow)
}

export function removeTerm(db: Db, id: number): void {
  const info = db.prepare('DELETE FROM term WHERE id = ?').run(id)
  if (info.changes === 0) throw new ApiError(404, 'Not found')
}
