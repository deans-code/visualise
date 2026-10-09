import { describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { openDb } from './db'
import { seedCatalogue } from './dictionary'
import type { DefinitionProvider } from './lookup'

const provider: DefinitionProvider = {
  name: 'Stub',
  lookup: async () => ({
    definition: 'Zig is a systems language.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Zig',
    sourceTitle: 'Zig',
    provider: 'Stub',
  }),
}

async function uploaded() {
  const db = openDb()
  seedCatalogue(db, {
    version: 1,
    terms: [{ name: 'Rust', kind: 'skill', section: 'technical', category: 'Languages', definition: 'Safe systems language.' }],
  })
  const app = buildApp(db, { providers: [provider] })
  const text = JSON.stringify({ values: [], skills: { technical: { experience: ['Zig', 'Nim'], desired: [] } } })
  const res = await app.inject({ method: 'POST', url: '/api/individuals/upload', payload: { files: [{ name: 'a.json', text }] } })
  const unresolved = res.json().unresolved as { id: number; name: string }[]
  const id = (name: string) => unresolved.find((t) => t.name === name)!.id
  const row = (name: string) =>
    db.prepare('SELECT definition, source_url, status, category FROM term WHERE canonical = ?').get(name) as {
      definition: string | null
      source_url: string | null
      status: string
      category: string | null
    }
  return { db, app, id, row }
}

describe('confirming definitions', () => {
  it('looking up and then walking away (reject / skip) leaves the term undefined with no definition', async () => {
    const { app, row } = await uploaded()
    const lookup = await app.inject({ method: 'POST', url: '/api/lookup', payload: { term: 'Zig', kind: 'skill', section: 'technical' } })
    expect(lookup.json().proposal.definition).toBe('Zig is a systems language.')
    // The user rejects Zig and skips Nim: the client makes no further calls.
    expect(row('Zig')).toEqual({ definition: null, source_url: null, status: 'undefined', category: null })
    expect(row('Nim')).toEqual({ definition: null, source_url: null, status: 'undefined', category: null })
  })

  it('accepting saves the definition, source and category and marks the term confirmed', async () => {
    const { app, id, row } = await uploaded()
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/terms/${id('Zig')}`,
      payload: {
        definition: 'Zig is a systems language.',
        sourceUrl: 'https://en.wikipedia.org/wiki/Zig',
        category: 'Languages',
        section: 'technical',
      },
    })
    expect(res.statusCode).toBe(200)
    expect(row('Zig')).toEqual({
      definition: 'Zig is a systems language.',
      source_url: 'https://en.wikipedia.org/wiki/Zig',
      status: 'confirmed',
      category: 'Languages',
    })
    expect(row('Nim').status).toBe('undefined')
  })

  it('a confirmed term is no longer reported as unresolved on later uploads', async () => {
    const { app, id } = await uploaded()
    await app.inject({ method: 'PATCH', url: `/api/terms/${id('Zig')}`, payload: { definition: 'Mine.' } })
    const text = JSON.stringify({ values: [], skills: { technical: { experience: ['zig', 'Nim'], desired: [] } } })
    const res = await app.inject({ method: 'POST', url: '/api/individuals/upload', payload: { files: [{ name: 'b.json', text }] } })
    expect(res.json().unresolved.map((t: { name: string }) => t.name)).toEqual(['Nim'])
  })

  it('refuses non-web source URLs', async () => {
    const { app, id, row } = await uploaded()
    for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x']) {
      const res = await app.inject({ method: 'PATCH', url: `/api/terms/${id('Zig')}`, payload: { definition: 'x', sourceUrl } })
      expect(res.statusCode).toBe(400)
    }
    expect(row('Zig').source_url).toBeNull()
  })

  it('clearing the definition returns the term to undefined', async () => {
    const { app, id, row } = await uploaded()
    await app.inject({ method: 'PATCH', url: `/api/terms/${id('Zig')}`, payload: { definition: 'Mine.' } })
    await app.inject({ method: 'PATCH', url: `/api/terms/${id('Zig')}`, payload: { definition: '  ' } })
    expect(row('Zig').status).toBe('undefined')
  })
})
