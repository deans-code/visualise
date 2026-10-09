import { normaliseTerm } from '../shared/normalise'
import type { Catalogue } from '../shared/catalogue'
import { spellingMatch } from '../shared/similarity'
import type { Db } from './db'

export type TermKind = 'value' | 'skill'

export interface TermRow {
  id: number
  canonical: string
  kind: TermKind
  section: string | null
  category: string | null
  definition: string | null
  source_url: string | null
  status: 'confirmed' | 'undefined'
  builtin: number
}

export class TermNotFoundError extends Error {
  constructor() {
    super('Term not found')
  }
}

export interface Suggestion {
  term: TermRow
  score: number
  reason: string
}

/** Run `fn` atomically. Joins an enclosing transaction instead of nesting. */
export function transaction<T>(db: Db, fn: () => T): T {
  if (db.isTransaction) return fn()
  db.exec('BEGIN')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

/** Exact match on the normalised name, then on recorded aliases. */
export function findTerm(db: Db, kind: TermKind, name: string): TermRow | undefined {
  const norm = normaliseTerm(name)
  const direct = db.prepare('SELECT * FROM term WHERE kind = ? AND norm = ?').get(kind, norm) as TermRow | undefined
  if (direct) return direct
  return db
    .prepare('SELECT t.* FROM term_alias a JOIN term t ON t.id = a.term_id WHERE t.kind = ? AND a.norm = ?')
    .get(kind, norm) as TermRow | undefined
}

/** Likely spelling variants of an unknown term. Never merges anything: callers present these for a decision. */
export function suggestMatches(db: Db, kind: TermKind, name: string, limit = 3): Suggestion[] {
  const norm = normaliseTerm(name)
  const rows = db.prepare('SELECT * FROM term WHERE kind = ? AND norm != ?').all(kind, norm) as unknown as (TermRow & {
    norm: string
  })[]
  const aliases = db
    .prepare('SELECT term_id, norm FROM term_alias')
    .all() as unknown as { term_id: number; norm: string }[]
  const aliasByTerm = new Map<number, string[]>()
  for (const a of aliases) aliasByTerm.set(a.term_id, [...(aliasByTerm.get(a.term_id) ?? []), a.norm])

  const out: Suggestion[] = []
  for (const row of rows) {
    // Only suggest established terms, not other unresolved placeholders.
    if (row.status === 'undefined' && !row.builtin) continue
    let best: { score: number; reason: string } | null = null
    for (const candidate of [row.norm, ...(aliasByTerm.get(row.id) ?? [])]) {
      const m = spellingMatch(norm, candidate)
      if (m && (!best || m.score > best.score)) best = m
    }
    if (best) out.push({ term: row, ...best })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Record an alias. Any placeholder term that used this spelling is merged into the target. */
export function addAlias(db: Db, termId: number, alias: string): void {
  const target = db.prepare('SELECT * FROM term WHERE id = ?').get(termId) as TermRow | undefined
  if (!target) throw new TermNotFoundError()
  const norm = normaliseTerm(alias)
  transaction(db, () => {
    const dupe = db.prepare('SELECT id FROM term WHERE kind = ? AND norm = ?').get(target.kind, norm) as
      | { id: number }
      | undefined
    if (dupe && dupe.id !== termId) mergeTerms(db, dupe.id, termId)
    if (norm !== normaliseTerm(target.canonical)) {
      db.prepare('INSERT OR IGNORE INTO term_alias (term_id, alias, norm) VALUES (?, ?, ?)').run(
        termId,
        alias.trim(),
        norm,
      )
    }
  })
}

/** Move every individual's links from `sourceId` onto `targetId`, then delete the source term. */
export function mergeTerms(db: Db, sourceId: number, targetId: number): void {
  transaction(db, () => {
    db.prepare(
      `INSERT OR IGNORE INTO individual_term (individual_id, term_id, role)
       SELECT individual_id, ?, role FROM individual_term WHERE term_id = ?`,
    ).run(targetId, sourceId)
    db.prepare('UPDATE OR IGNORE term_alias SET term_id = ? WHERE term_id = ?').run(targetId, sourceId)
    db.prepare('DELETE FROM term WHERE id = ?').run(sourceId) // cascades remaining links and aliases
  })
}

export interface SeedSummary {
  added: number
  updated: number
}

/**
 * Seed the dictionary from the profile app's catalogue. Idempotent: re-running adds new terms, refreshes
 * category/section/definition of built-in ones, and keeps custom terms, aliases and confirmed definitions.
 */
export function seedCatalogue(db: Db, catalogue: Catalogue): SeedSummary {
  const summary: SeedSummary = { added: 0, updated: 0 }
  transaction(db, () => {
    for (const t of catalogue.terms) {
      const norm = normaliseTerm(t.name)
      const existing = db.prepare('SELECT * FROM term WHERE kind = ? AND norm = ?').get(t.kind, norm) as
        | TermRow
        | undefined
      if (!existing) {
        db.prepare(
          `INSERT INTO term (canonical, norm, kind, section, category, definition, status, builtin)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        ).run(t.name, norm, t.kind, t.section, t.category, t.definition, t.definition ? 'confirmed' : 'undefined')
        summary.added++
        continue
      }
      // A confirmed definition the user wrote for a custom term wins over the catalogue's.
      const keepOwn = !existing.builtin && existing.status === 'confirmed' && existing.definition
      db.prepare(
        `UPDATE term SET canonical = ?, section = ?, category = ?, builtin = 1,
           definition = ?, status = ?, source_url = ?
         WHERE id = ?`,
      ).run(
        t.name,
        t.section,
        t.category,
        keepOwn ? existing.definition : t.definition,
        keepOwn || t.definition ? 'confirmed' : 'undefined',
        keepOwn ? existing.source_url : null,
        existing.id,
      )
      summary.updated++
    }
  })
  return summary
}

/** A short, stable fingerprint of the catalogue text, used to notice that a new version of the site ships new terms. */
export function fingerprintOf(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(16)}-${text.length}`
}

/**
 * Seed from the catalogue only when it differs from what this database was last seeded with, so opening the site
 * does not re-write 400 terms every visit. Returns null when nothing needed doing.
 */
export function seedIfChanged(db: Db, catalogue: Catalogue, fingerprint: string): SeedSummary | null {
  const seen = db.prepare("SELECT value FROM meta WHERE key = 'catalogue'").get() as { value: string } | undefined
  if (seen?.value === fingerprint) return null
  const summary = seedCatalogue(db, catalogue)
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('catalogue', ?)").run(fingerprint)
  return summary
}
