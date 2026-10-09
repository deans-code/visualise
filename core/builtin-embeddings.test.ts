import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Catalogue } from '../shared/catalogue'
import { createApi } from './api'
import { embeddingKey, packEmbeddings, parseEmbeddings, type EmbeddingsMeta } from './builtin-embeddings'
import { openDb } from './db'
import { fingerprintOf, seedCatalogue } from './dictionary'
import { cosine, loadEmbeddings } from './embeddings'

const dir = 'public/catalogue'
const text = readFileSync(`${dir}/catalogue.json`, 'utf-8')
const catalogue = JSON.parse(text) as Catalogue
const meta = JSON.parse(readFileSync(`${dir}/embeddings.json`, 'utf-8')) as EmbeddingsMeta
const bin = readFileSync(`${dir}/embeddings.bin`)
const buffer = () => bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer
const fingerprint = fingerprintOf(text)

describe('the shipped embeddings', () => {
  it('belong to the shipped catalogue: right model, one 384-d vector per term, same fingerprint', () => {
    expect(meta.model).toBe('Xenova/all-MiniLM-L6-v2')
    expect(meta.dims).toBe(384)
    expect(meta.count).toBe(catalogue.terms.length)
    expect(meta.catalogue).toBe(fingerprint) // fails if the catalogue is refreshed without `npm run embed-catalogue`
    expect(bin.byteLength).toBe(meta.count * meta.dims * 4)
  })

  it('load into a vector per term, normalised, with similar terms closer than unrelated ones', () => {
    const vectors = parseEmbeddings(meta, buffer(), catalogue, fingerprint)
    expect(vectors.size).toBe(catalogue.terms.length)
    const get = (kind: string, name: string) => vectors.get(embeddingKey(kind, name))!
    expect(Math.hypot(...get('skill', 'React'))).toBeCloseTo(1, 3)
    expect(cosine(get('skill', 'React'), get('skill', 'Vue'))).toBeGreaterThan(cosine(get('skill', 'React'), get('skill', 'Kubernetes')))
  })

  it('are refused, with the reason, when they do not match the catalogue', () => {
    expect(() => parseEmbeddings(meta, buffer(), catalogue, 'other')).toThrow(/different catalogue/)
    expect(() => parseEmbeddings({ ...meta, count: 3 }, buffer(), catalogue, fingerprint)).toThrow(/Expected 388/)
    expect(() => parseEmbeddings(meta, buffer().slice(4), catalogue, fingerprint)).toThrow(/wrong size/)
  })
})

describe('packEmbeddings', () => {
  it('round-trips and rejects ragged vectors', () => {
    const packed = packEmbeddings([
      [1, 0],
      [0, 1],
    ])
    expect(packed.meta).toEqual({ dims: 2, count: 2 })
    expect(Array.from(new Float32Array(packed.bytes.buffer))).toEqual([1, 0, 0, 1])
    expect(() => packEmbeddings([[1, 0], [1]])).toThrow(/dimensions/)
  })
})

describe('relatedness for built-in terms, with no model', () => {
  const setup = () => {
    const db = openDb()
    seedCatalogue(db, catalogue)
    return { db, vectors: parseEmbeddings(meta, buffer(), catalogue, fingerprint) }
  }

  it('maps vectors onto dictionary rows, and lets stored custom-term vectors add to them', () => {
    const { db, vectors } = setup()
    db.prepare("INSERT INTO term (canonical, norm, kind, section, status, embedding) VALUES ('Zig', 'zig', 'skill', 'technical', 'undefined', ?)").run(
      JSON.stringify([0.5, 0.5]),
    )
    const byId = loadEmbeddings(db, vectors)
    expect(byId.size).toBe(catalogue.terms.length + 1)
    expect(loadEmbeddings(db).size).toBe(1) // without the shipped vectors only the stored one is known
  })

  it('relates React and Vue for two people who share neither exactly, using no embedder', async () => {
    const { db, vectors } = setup()
    const api = createApi({ db, builtinEmbeddings: vectors })
    const profile = (skill: string) => JSON.stringify({ values: [], skills: { technical: { experience: [skill], desired: [] } } })
    await api.upload([
      { name: 'a.json', text: profile('React') },
      { name: 'b.json', text: profile('Vue') },
      { name: 'c.json', text: profile('Kubernetes') },
    ])
    const graph = await api.graph()
    const id = (n: string) => graph.terms.find((t) => t.name === n)!.id
    const pairs = graph.related.map((r) => [r.a, r.b].sort().join('-'))
    expect(pairs).toContain([id('React'), id('Vue')].sort().join('-'))
    expect(pairs).not.toContain([id('React'), id('Kubernetes')].sort().join('-'))
    expect(graph.related.find((r) => [r.a, r.b].includes(id('Vue')) && [r.a, r.b].includes(id('React')))?.reasons.join(' ')).toMatch(/similar definitions|category/i)
  })
})
