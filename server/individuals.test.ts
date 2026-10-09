import { beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { openDb, type Db } from './db'

const profile = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    values: ['Integrity'],
    skills: { technical: { experience: ['React'], desired: ['Rust'] } },
    ...over,
  })

let db: Db
let app: ReturnType<typeof buildApp>

const upload = (files: { name: string; text: string }[], resolutions?: Record<string, string>) =>
  app.inject({ method: 'POST', url: '/api/individuals/upload', payload: { files, resolutions } })

beforeEach(() => {
  db = openDb()
  app = buildApp(db)
})

describe('upload', () => {
  it('imports 2 of 3 files and reports the invalid one', async () => {
    const res = await upload([
      { name: 'alex.json', text: profile() },
      { name: 'bo.json', text: profile({ values: ['Trust'] }) },
      { name: 'broken.json', text: JSON.stringify({ values: [] }) },
    ])
    const body = res.json()
    expect(body.imported.map((i: { name: string }) => i.name)).toEqual(['alex', 'bo'])
    expect(body.errors).toEqual([{ file: 'broken.json', reason: 'skills must be an object' }])
    const list = (await app.inject({ url: '/api/individuals' })).json()
    expect(list).toHaveLength(2)
  })

  it('reports non-JSON files', async () => {
    const body = (await upload([{ name: 'x.json', text: 'nope' }])).json()
    expect(body.errors[0].reason).toMatch(/Not valid JSON/)
    expect(body.imported).toEqual([])
  })

  it('shares term rows between individuals (case-insensitive)', async () => {
    await upload([
      { name: 'a.json', text: profile() },
      { name: 'b.json', text: profile({ values: ['integrity'] }) },
    ])
    const n = db.prepare("SELECT COUNT(*) AS n FROM term WHERE norm = 'integrity'").get() as { n: number }
    expect(n.n).toBe(1)
  })

  it('rejects a malformed request body', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/individuals/upload', payload: { nope: 1 } })
    expect(res.statusCode).toBe(400)
  })
})

describe('duplicates', () => {
  beforeEach(async () => {
    await upload([{ name: 'alex.json', text: profile() }])
  })

  it('flags a name clash instead of importing', async () => {
    const body = (await upload([{ name: 'alex.json', text: profile({ values: ['Trust'] }) }])).json()
    expect(body.conflicts).toHaveLength(1)
    expect(body.imported).toEqual([])
    expect(await app.inject({ url: '/api/individuals' }).then((r) => r.json())).toHaveLength(1)
  })

  it('replace overwrites the existing individual without duplicating', async () => {
    const files = [{ name: 'alex.json', text: profile({ values: ['Trust', 'Courage'] }) }]
    const body = (await upload(files, { 'alex.json': 'replace' })).json()
    expect(body.imported).toHaveLength(1)
    const list = (await app.inject({ url: '/api/individuals' })).json()
    expect(list).toHaveLength(1)
    // 2 values + React + Rust
    expect(list[0].termCount).toBe(4)
  })

  it('keep creates a second individual with the same name', async () => {
    await upload([{ name: 'alex.json', text: profile() }], { 'alex.json': 'keep' })
    expect(await app.inject({ url: '/api/individuals' }).then((r) => r.json())).toHaveLength(2)
  })
})

describe('rename and delete', () => {
  it('renames and deletes while keeping dictionary terms', async () => {
    const { imported } = (await upload([{ name: 'alex-smith.json', text: profile() }])).json()
    const id = imported[0].id

    const renamed = await app.inject({ method: 'PATCH', url: `/api/individuals/${id}`, payload: { name: 'Alex S.' } })
    expect(renamed.statusCode).toBe(200)
    expect((await app.inject({ url: '/api/individuals' })).json()[0].name).toBe('Alex S.')

    const termsBefore = (db.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n
    expect((await app.inject({ method: 'DELETE', url: `/api/individuals/${id}` })).statusCode).toBe(204)
    expect((await app.inject({ url: '/api/individuals' })).json()).toEqual([])
    expect((db.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n).toBe(termsBefore)
    expect((await app.inject({ method: 'DELETE', url: `/api/individuals/${id}` })).statusCode).toBe(404)
  })

  it('rejects an empty name', async () => {
    const { imported } = (await upload([{ name: 'a.json', text: profile() }])).json()
    const res = await app.inject({ method: 'PATCH', url: `/api/individuals/${imported[0].id}`, payload: { name: ' ' } })
    expect(res.statusCode).toBe(400)
  })
})

describe('unresolved terms', () => {
  const withSkills = (experience: string[], values: string[] = []) =>
    JSON.stringify({ values, skills: { technical: { experience, desired: [] } } })

  it('lists each unknown term once across a batch', async () => {
    const body = (
      await upload([
        { name: 'a.json', text: withSkills(['Zig']) },
        { name: 'b.json', text: withSkills(['Zig', 'React']) },
        { name: 'c.json', text: withSkills(['zig']) },
      ])
    ).json()
    const names = body.unresolved.map((t: { name: string }) => t.name)
    expect(names.filter((n: string) => n.toLowerCase() === 'zig')).toHaveLength(1)
    expect(body.unresolved.find((t: { name: string }) => t.name === 'Zig')).toMatchObject({ kind: 'skill', section: 'technical' })
  })

  it('leaves out built-in terms and ones already defined', async () => {
    db.prepare("INSERT INTO term (canonical, norm, kind, section, category, definition, builtin) VALUES ('React', 'react', 'skill', 'technical', 'Web', 'UI', 1)").run()
    db.prepare("INSERT INTO term (canonical, norm, kind, section, definition, status) VALUES ('Zig', 'zig', 'skill', 'technical', 'Mine', 'confirmed')").run()
    const body = (await upload([{ name: 'a.json', text: withSkills(['React', 'Zig', 'Nim']) }])).json()
    expect(body.unresolved.map((t: { name: string }) => t.name)).toEqual(['Nim'])
  })

  it('attaches near-duplicate suggestions', async () => {
    db.prepare("INSERT INTO term (canonical, norm, kind, section, category, definition, builtin) VALUES ('PostgreSQL', 'postgresql', 'skill', 'technical', 'Data', 'A DB', 1)").run()
    const body = (await upload([{ name: 'a.json', text: withSkills(['Postgres']) }])).json()
    expect(body.unresolved[0].suggestions).toMatchObject([{ name: 'PostgreSQL', reason: 'abbreviation' }])
  })

  it('only reports terms from files imported in this request', async () => {
    await upload([{ name: 'a.json', text: withSkills(['Zig']) }])
    const body = (await upload([{ name: 'b.json', text: withSkills(['React']) }])).json()
    expect(body.unresolved.map((t: { name: string }) => t.name)).toEqual(['React'])
  })
})
