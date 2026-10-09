import { describe, expect, it } from 'vitest'
import type { Catalogue } from '../shared/catalogue'
import { createApi } from './api'
import { openDb } from './db'
import { fingerprintOf, findTerm, seedIfChanged } from './dictionary'

const catalogue = (extra: Catalogue['terms'] = []): Catalogue => ({
  version: 1,
  terms: [
    { name: 'React', kind: 'skill', section: 'technical', category: 'Web and frontend', definition: 'A UI library.' },
    { name: 'Trust', kind: 'value', section: null, category: 'Relationships', definition: 'Relying on others.' },
    ...extra,
  ],
})

const profile = (skills: string[]) => JSON.stringify({ values: ['Trust'], skills: { technical: { experience: skills, desired: [] } } })

describe('seeding by fingerprint', () => {
  it('seeds on first use, and does nothing when the catalogue is unchanged', () => {
    const db = openDb()
    const fp = fingerprintOf(JSON.stringify(catalogue()))
    expect(seedIfChanged(db, catalogue(), fp)).toEqual({ added: 2, updated: 0 })
    expect(seedIfChanged(db, catalogue(), fp)).toBeNull()
  })

  it('adds new built-in terms when a new version of the catalogue ships, keeping custom terms and confirmed definitions', async () => {
    const db = openDb()
    seedIfChanged(db, catalogue(), 'v1')
    const api = createApi({ db })
    await api.upload([{ name: 'a.json', text: profile(['React', 'Zig']) }])
    const zig = findTerm(db, 'skill', 'Zig')!
    await api.updateTerm(zig.id, { definition: 'A systems language.' })

    const more = catalogue([{ name: 'Vue', kind: 'skill', section: 'technical', category: 'Web and frontend', definition: 'Another UI library.' }])
    expect(seedIfChanged(db, more, 'v2')).toEqual({ added: 1, updated: 2 })
    expect(findTerm(db, 'skill', 'Vue')?.builtin).toBe(1)
    expect(findTerm(db, 'skill', 'Zig')).toMatchObject({ definition: 'A systems language.', status: 'confirmed', builtin: 0 })
    expect((await api.listIndividuals())[0].termCount).toBeGreaterThan(0)
  })

  it('has a fingerprint that changes with the text', () => {
    expect(fingerprintOf('a')).not.toBe(fingerprintOf('b'))
    expect(fingerprintOf('same')).toBe(fingerprintOf('same'))
  })
})

describe('clearAll', () => {
  it('removes people, custom terms and aliases, and returns built-in terms to the catalogue', async () => {
    const db = openDb()
    seedIfChanged(db, catalogue(), 'v1')
    let saves = 0
    const api = createApi({ db, catalogue: catalogue(), changed: () => saves++ })
    await api.upload([{ name: 'a.json', text: profile(['React', 'Zig']) }])
    const react = findTerm(db, 'skill', 'React')!
    await api.updateTerm(react.id, { definition: 'My own words.', category: 'Mine' })
    await api.addAlias(react.id, 'ReactJS')
    saves = 0

    await api.clearAll()

    expect(await api.listIndividuals()).toEqual([])
    expect(findTerm(db, 'skill', 'Zig')).toBeUndefined()
    expect(findTerm(db, 'skill', 'ReactJS')).toBeUndefined()
    expect(findTerm(db, 'skill', 'React')).toMatchObject({ definition: 'A UI library.', category: 'Web and frontend' })
    expect((await api.listTerms()).map((t) => t.name).sort()).toEqual(['React', 'Trust'])
    expect(saves).toBe(1)
  })

  it('leaves the data alone if it fails part way', async () => {
    const db = openDb()
    seedIfChanged(db, catalogue(), 'v1')
    const api = createApi({ db })
    await api.upload([{ name: 'a.json', text: profile(['React']) }])
    db.exec('DROP TABLE term_alias') // makes the second delete fail
    await expect(api.clearAll()).rejects.toThrow()
    expect(db.isTransaction).toBe(false)
    expect(await api.listIndividuals()).toHaveLength(1)
  })
})
