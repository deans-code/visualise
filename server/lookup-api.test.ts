import { describe, expect, it, vi } from 'vitest'
import { buildApp } from './app'
import { openDb, type Db } from './db'
import { seedCatalogue } from './dictionary'
import type { DefinitionProvider } from './lookup'

const found: DefinitionProvider = {
  name: 'Stub',
  lookup: vi.fn(async () => ({
    definition: 'Zig is a systems language.',
    sourceUrl: 'https://ziglang.org',
    sourceTitle: 'Zig',
    provider: 'Stub',
  })),
}

/** Everything in the database, for before/after comparison. */
const snapshot = (db: Db) =>
  JSON.stringify(
    ['individual', 'term', 'term_alias', 'individual_term'].map((t) => db.prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all()),
  )

function setup(providers: DefinitionProvider[]) {
  const db = openDb()
  seedCatalogue(db, {
    version: 1,
    terms: [{ name: 'React', kind: 'skill', section: 'technical', category: 'Web', definition: 'UI library' }],
  })
  db.prepare("INSERT INTO term (canonical, norm, kind, section, status) VALUES ('Zig', 'zig', 'skill', 'technical', 'undefined')").run()
  return { db, app: buildApp(db, { providers }) }
}

describe('POST /api/lookup', () => {
  it('returns a proposal and leaves the database untouched', async () => {
    const { db, app } = setup([found])
    const before = snapshot(db)
    const res = await app.inject({
      method: 'POST',
      url: '/api/lookup',
      payload: { term: 'Zig', kind: 'skill', section: 'technical' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      proposal: { definition: 'Zig is a systems language.', sourceUrl: 'https://ziglang.org', sourceTitle: 'Zig', provider: 'Stub' },
      errors: [],
    })
    expect(found.lookup).toHaveBeenCalledWith({ term: 'Zig', kind: 'skill', section: 'technical' })
    expect(snapshot(db)).toBe(before)
  })

  it('reports failures without an error status, so the user can enter a definition manually', async () => {
    const down: DefinitionProvider = { name: 'Down', lookup: async () => { throw new Error('offline') } }
    const { db, app } = setup([down])
    const before = snapshot(db)
    const res = await app.inject({ method: 'POST', url: '/api/lookup', payload: { term: 'Zig', kind: 'skill' } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ proposal: null, errors: [{ provider: 'Down', message: 'offline' }] })
    expect(snapshot(db)).toBe(before)
  })

  it('validates the body', async () => {
    const { app } = setup([found])
    for (const payload of [{}, { term: ' ', kind: 'skill' }, { term: 'Zig', kind: 'nope' }]) {
      expect((await app.inject({ method: 'POST', url: '/api/lookup', payload })).statusCode).toBe(400)
    }
  })
})
