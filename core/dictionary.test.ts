import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Catalogue } from '../shared/catalogue'
import { buildApp } from './test-app'
import { openDb, type Db } from './db'
import { addAlias, findTerm, seedCatalogue, suggestMatches } from './dictionary'

const catalogue: Catalogue = {
  version: 1,
  terms: [
    { name: 'TypeScript', kind: 'skill', section: 'technical', category: 'Languages', definition: 'Typed JS.' },
    { name: 'PostgreSQL', kind: 'skill', section: 'technical', category: 'Data', definition: 'A database.' },
    { name: 'React', kind: 'skill', section: 'technical', category: 'Web and frontend', definition: 'A UI library.' },
    { name: 'Rust', kind: 'skill', section: 'technical', category: 'Languages', definition: 'Safe systems language.' },
    { name: 'Trust', kind: 'value', section: null, category: 'Relationships and community', definition: 'Reliance.' },
  ],
}

let db: Db
beforeEach(() => {
  db = openDb()
  seedCatalogue(db, catalogue)
})

describe('findTerm (exact and alias matching)', () => {
  it('matches case and whitespace variants', () => {
    expect(findTerm(db, 'skill', 'typescript')?.canonical).toBe('TypeScript')
    expect(findTerm(db, 'skill', '  TYPESCRIPT  ')?.canonical).toBe('TypeScript')
  })

  it('ignores wrapping punctuation but keeps meaningful symbols', () => {
    expect(findTerm(db, 'skill', '"React",')?.canonical).toBe('React')
  })

  it('does not match across kinds', () => {
    expect(findTerm(db, 'value', 'Rust')).toBeUndefined()
    expect(findTerm(db, 'skill', 'Trust')).toBeUndefined()
  })

  it('matches a recorded alias', () => {
    const pg = findTerm(db, 'skill', 'PostgreSQL')!
    addAlias(db, pg.id, 'Postgres')
    expect(findTerm(db, 'skill', 'postgres')?.canonical).toBe('PostgreSQL')
  })
})

describe('suggestMatches (never merges)', () => {
  it('suggests PostgreSQL for "Postgres"', () => {
    const s = suggestMatches(db, 'skill', 'Postgres')
    expect(s[0].term.canonical).toBe('PostgreSQL')
    expect(s[0].reason).toBe('abbreviation')
  })

  it('suggests for a typo', () => {
    expect(suggestMatches(db, 'skill', 'Typscript')[0].term.canonical).toBe('TypeScript')
  })

  it('gives no suggestion for unrelated terms', () => {
    expect(suggestMatches(db, 'skill', 'Kubernetes')).toEqual([])
    expect(suggestMatches(db, 'skill', 'Ruby')).toEqual([])
  })

  it('does not change the dictionary', () => {
    suggestMatches(db, 'skill', 'Postgres')
    expect((db.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n).toBe(5)
  })
})

describe('alias acceptance', () => {
  it('merges an existing placeholder into the target and keeps links', async () => {
    const app = buildApp(db)
    const profile = JSON.stringify({ values: [], skills: { technical: { experience: ['Postgres'], desired: [] } } })
    await app.inject({ method: 'POST', url: '/api/individuals/upload', payload: { files: [{ name: 'a.json', text: profile }] } })
    const placeholder = findTerm(db, 'skill', 'Postgres')!
    expect(placeholder.status).toBe('undefined')

    const pg = findTerm(db, 'skill', 'PostgreSQL')!
    const res = await app.inject({ method: 'POST', url: `/api/terms/${pg.id}/aliases`, payload: { alias: 'Postgres' } })
    expect(res.statusCode).toBe(204)

    expect(findTerm(db, 'skill', 'Postgres')?.id).toBe(pg.id)
    const links = db.prepare('SELECT term_id FROM individual_term').all() as { term_id: number }[]
    expect(links).toEqual([{ term_id: pg.id }])
    expect((db.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n).toBe(5)
  })

  it('later uploads resolve through the alias without creating a term', async () => {
    const app = buildApp(db)
    addAlias(db, findTerm(db, 'skill', 'PostgreSQL')!.id, 'Postgres')
    const profile = JSON.stringify({ values: [], skills: { technical: { experience: ['postgres'], desired: [] } } })
    await app.inject({ method: 'POST', url: '/api/individuals/upload', payload: { files: [{ name: 'a.json', text: profile }] } })
    expect((db.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n).toBe(5)
  })
})

describe('seedCatalogue', () => {
  it('loads category, section and definition', () => {
    const react = findTerm(db, 'skill', 'React')!
    expect(react).toMatchObject({ category: 'Web and frontend', section: 'technical', builtin: 1, status: 'confirmed' })
    expect(react.definition).toBe('A UI library.')
  })

  it('is idempotent and preserves custom terms, aliases and own definitions', () => {
    db.prepare(
      "INSERT INTO term (canonical, norm, kind, section, category, definition, status) VALUES ('Zig', 'zig', 'skill', 'technical', 'Languages', 'My Zig definition', 'confirmed')",
    ).run()
    addAlias(db, findTerm(db, 'skill', 'PostgreSQL')!.id, 'Postgres')

    const again = seedCatalogue(db, {
      ...catalogue,
      terms: [...catalogue.terms, { name: 'Zig', kind: 'skill', section: 'technical', category: 'Languages', definition: 'Catalogue Zig' }, { name: 'Go', kind: 'skill', section: 'technical', category: 'Languages', definition: 'Go lang' }],
    })
    expect(again.added).toBe(1) // Go
    expect(findTerm(db, 'skill', 'Zig')).toMatchObject({ definition: 'My Zig definition', builtin: 1 })
    expect(findTerm(db, 'skill', 'postgres')?.canonical).toBe('PostgreSQL')
    expect((db.prepare("SELECT COUNT(*) AS n FROM term WHERE norm = 'react'").get() as { n: number }).n).toBe(1)
  })

  it('upgrades a placeholder created by an earlier upload', async () => {
    const fresh = openDb()
    const app = buildApp(fresh)
    const profile = JSON.stringify({ values: ['Trust'], skills: {} })
    await app.inject({ method: 'POST', url: '/api/individuals/upload', payload: { files: [{ name: 'a.json', text: profile }] } })
    expect(findTerm(fresh, 'value', 'Trust')?.status).toBe('undefined')
    seedCatalogue(fresh, catalogue)
    expect(findTerm(fresh, 'value', 'Trust')).toMatchObject({ status: 'confirmed', category: 'Relationships and community' })
    expect((fresh.prepare('SELECT COUNT(*) AS n FROM individual_term').get() as { n: number }).n).toBe(1)
  })
})

describe('the shipped catalogue snapshot', () => {
  const snapshot = JSON.parse(readFileSync('public/catalogue/catalogue.json', 'utf-8')) as Catalogue

  it('has every term with a category and definition', () => {
    expect(snapshot.terms.length).toBeGreaterThan(300)
    for (const t of snapshot.terms) {
      expect(t.category, t.name).toBeTruthy()
      expect(t.definition, t.name).toBeTruthy()
    }
  })

  it('lets a profile of built-in terms upload with nothing left unresolved', async () => {
    const fresh = openDb()
    seedCatalogue(fresh, snapshot)
    const skills = (section: string) => snapshot.terms.filter((t) => t.section === section).slice(0, 5).map((t) => t.name)
    const profile = JSON.stringify({
      values: snapshot.terms.filter((t) => t.kind === 'value').slice(0, 5).map((t) => t.name),
      skills: {
        technical: { experience: skills('technical'), desired: [] },
        ai: { experience: [], desired: skills('ai') },
      },
    })
    const before = (fresh.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n
    await buildApp(fresh).inject({ method: 'POST', url: '/api/individuals/upload', payload: { files: [{ name: 'a.json', text: profile }] } })
    expect((fresh.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n).toBe(before)
    expect((fresh.prepare("SELECT COUNT(*) AS n FROM term WHERE status = 'undefined'").get() as { n: number }).n).toBe(0)
  })
})
