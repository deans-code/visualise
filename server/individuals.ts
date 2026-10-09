import type { FastifyInstance } from 'fastify'
import { normaliseTerm } from '../shared/normalise'
import { parseProfile, SECTIONS, type Profile } from '../shared/profile'
import type { Db } from './db'
import { findTerm, suggestMatches, transaction } from './dictionary'

export interface UploadFile {
  name: string
  text: string
}

export type Resolution = 'replace' | 'keep'

export interface UploadResult {
  imported: { id: number; name: string }[]
  errors: { file: string; reason: string }[]
  /** Files whose name matches an existing individual and need a Replace / Keep-both decision. */
  conflicts: { file: string; name: string; existingId: number }[]
  /** Custom terms from the imported files that the dictionary has no definition for, each listed once. */
  unresolved: UnresolvedTerm[]
}

export interface UnresolvedTerm {
  id: number
  name: string
  kind: 'value' | 'skill'
  section: string | null
  /** Likely spellings of established terms. Only ever suggestions; nothing is merged without the user. */
  suggestions: { id: number; name: string; reason: string }[]
}

export const displayNameFromFile = (file: string) => file.replace(/\.json$/i, '').trim() || file

type Link = { kind: 'value' | 'skill'; section: string | null; term: string; role: 'value' | 'experience' | 'desired' }

function linksFor(profile: Profile): Link[] {
  const links: Link[] = profile.values.map((term) => ({ kind: 'value', section: null, term, role: 'value' }))
  for (const section of SECTIONS) {
    for (const role of ['experience', 'desired'] as const) {
      for (const term of profile.skills[section][role]) links.push({ kind: 'skill', section, term, role })
    }
  }
  return links
}

/** Find a term (by name or alias), creating an unresolved placeholder if unseen. */
function termIdFor(db: Db, link: Link): number {
  const found = findTerm(db, link.kind, link.term)
  if (found) return found.id
  const info = db
    .prepare("INSERT INTO term (canonical, norm, kind, section, status) VALUES (?, ?, ?, ?, 'undefined')")
    .run(link.term, normaliseTerm(link.term), link.kind, link.section)
  return Number(info.lastInsertRowid)
}

function writeLinks(db: Db, individualId: number, profile: Profile) {
  const insert = db.prepare('INSERT OR IGNORE INTO individual_term (individual_id, term_id, role) VALUES (?, ?, ?)')
  for (const link of linksFor(profile)) insert.run(individualId, termIdFor(db, link), link.role)
}

export function uploadProfiles(
  db: Db,
  files: UploadFile[],
  resolutions: Record<string, Resolution> = {},
): UploadResult {
  const result: UploadResult = { imported: [], errors: [], conflicts: [], unresolved: [] }

  for (const file of files) {
    const parsed = parseProfile(file.text)
    if (!parsed.ok) {
      result.errors.push({ file: file.name, reason: parsed.error })
      continue
    }
    const name = displayNameFromFile(file.name)
    const existing = db.prepare('SELECT id FROM individual WHERE name = ?').get(name) as { id: number } | undefined
    const resolution = resolutions[file.name]

    if (existing && !resolution) {
      result.conflicts.push({ file: file.name, name, existingId: existing.id })
      continue
    }

    const id = transaction(db, () => {
      if (existing && resolution === 'replace') {
        db.prepare('DELETE FROM individual_term WHERE individual_id = ?').run(existing.id)
        writeLinks(db, existing.id, parsed.profile)
        return existing.id
      }
      const info = db.prepare('INSERT INTO individual (name) VALUES (?)').run(name)
      const newId = Number(info.lastInsertRowid)
      writeLinks(db, newId, parsed.profile)
      return newId
    })
    result.imported.push({ id, name })
  }
  result.unresolved = unresolvedFor(db, result.imported.map((i) => i.id))
  return result
}

function unresolvedFor(db: Db, individualIds: number[]): UnresolvedTerm[] {
  if (individualIds.length === 0) return []
  const rows = db
    .prepare(
      `SELECT DISTINCT t.id, t.canonical, t.kind, t.section
       FROM term t JOIN individual_term it ON it.term_id = t.id
       WHERE t.status = 'undefined' AND t.builtin = 0 AND it.individual_id IN (${individualIds.map(() => '?').join(',')})
       ORDER BY t.canonical COLLATE NOCASE`,
    )
    .all(...individualIds) as unknown as { id: number; canonical: string; kind: 'value' | 'skill'; section: string | null }[]
  return rows.map((r) => ({
    id: r.id,
    name: r.canonical,
    kind: r.kind,
    section: r.section,
    suggestions: suggestMatches(db, r.kind, r.canonical).map((s) => ({
      id: s.term.id,
      name: s.term.canonical,
      reason: s.reason,
    })),
  }))
}

export function listIndividuals(db: Db) {
  return db
    .prepare(
      `SELECT i.id, i.name, COUNT(it.term_id) AS termCount
       FROM individual i LEFT JOIN individual_term it ON it.individual_id = i.id
       GROUP BY i.id ORDER BY i.name COLLATE NOCASE`,
    )
    .all() as { id: number; name: string; termCount: number }[]
}

export function registerIndividualRoutes(app: FastifyInstance) {
  const db = app.db

  app.post('/api/individuals/upload', async (req, reply) => {
    const body = req.body as { files?: UploadFile[]; resolutions?: Record<string, Resolution> } | undefined
    if (!body || !Array.isArray(body.files) || body.files.some((f) => typeof f?.name !== 'string' || typeof f?.text !== 'string')) {
      return reply.code(400).send({ error: 'Body must be { files: [{ name, text }] }' })
    }
    return uploadProfiles(db, body.files, body.resolutions)
  })

  app.get('/api/individuals', async () => listIndividuals(db))

  app.patch('/api/individuals/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const name = ((req.body as { name?: unknown } | undefined)?.name ?? '') as string
    if (typeof name !== 'string' || !name.trim()) return reply.code(400).send({ error: 'name is required' })
    const info = db.prepare('UPDATE individual SET name = ? WHERE id = ?').run(name.trim(), id)
    if (info.changes === 0) return reply.code(404).send({ error: 'Not found' })
    return { id, name: name.trim() }
  })

  app.delete('/api/individuals/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const info = db.prepare('DELETE FROM individual WHERE id = ?').run(id)
    if (info.changes === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })
}
