import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { Catalogue } from '../shared/catalogue'
import { createApi } from './api'
import { parseEmbeddings, type EmbeddingsMeta } from './builtin-embeddings'
import { openDb } from './db'
import { fingerprintOf, seedCatalogue } from './dictionary'
import type { Embedder } from './embeddings'
import { defaultProviders, type FetchLike } from './lookup'

const dir = 'public/catalogue'
const text = readFileSync(`${dir}/catalogue.json`, 'utf-8')
const catalogue = JSON.parse(text) as Catalogue
const bin = readFileSync(`${dir}/embeddings.bin`)
const shipped = parseEmbeddings(
  JSON.parse(readFileSync(`${dir}/embeddings.json`, 'utf-8')) as EmbeddingsMeta,
  bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer,
  catalogue,
  fingerprintOf(text),
)

const profile = (...skills: string[]) => JSON.stringify({ values: [], skills: { technical: { experience: skills, desired: [] } } })
const setup = (embedder?: Embedder | (() => Embedder | null)) => {
  const db = openDb()
  seedCatalogue(db, catalogue)
  const api = createApi({ db, builtinEmbeddings: shipped, embedder: typeof embedder === 'function' ? embedder : () => embedder ?? null })
  return { db, api }
}
const tick = () => new Promise((r) => setTimeout(r, 10))

describe('the language model is only used for custom terms', () => {
  it('is never asked for anything when people only use built-in terms', async () => {
    const embed = vi.fn(async (t: string[]) => t.map(() => [1, 0]))
    const { api } = setup({ embed })
    await api.upload([{ name: 'a.json', text: profile('React', 'Vue') }])
    await api.graph()
    await tick()
    expect(embed).not.toHaveBeenCalled()
  })

  it('is not asked about a custom term that has no definition yet', async () => {
    const embed = vi.fn(async (t: string[]) => t.map(() => [1, 0]))
    const { api } = setup({ embed })
    await api.upload([{ name: 'a.json', text: profile('Zig') }])
    await api.graph()
    await tick()
    expect(embed).not.toHaveBeenCalled()
  })

  it('embeds a custom term once it is confirmed, stores the vector, and does not ask again', async () => {
    const embed = vi.fn(async (t: string[]) => t.map(() => [0.6, 0.8]))
    const { api, db } = setup({ embed })
    const out = await api.upload([{ name: 'a.json', text: profile('Zig') }])
    await api.updateTerm(out.unresolved[0].id, { definition: 'A systems language.', category: 'Languages', section: 'technical' })
    await tick()
    expect(embed).toHaveBeenCalledTimes(1)
    expect(embed.mock.calls[0][0]).toEqual(['Zig: A systems language.'])
    expect(JSON.parse((db.prepare("SELECT embedding FROM term WHERE canonical = 'Zig'").get() as { embedding: string }).embedding)).toEqual([0.6, 0.8])

    await api.graph()
    await tick()
    expect(embed).toHaveBeenCalledTimes(1)
  })

  it('saves after custom-term embeddings are stored', async () => {
    const changed = vi.fn()
    const db = openDb()
    seedCatalogue(db, catalogue)
    const api = createApi({ db, builtinEmbeddings: shipped, embedder: () => ({ embed: async (t) => (await tick(), t.map(() => [1, 0])) }), changed })
    const out = await api.upload([{ name: 'a.json', text: profile('Zig') }])
    await api.updateTerm(out.unresolved[0].id, { definition: 'A systems language.' })
    expect(changed).toHaveBeenCalledTimes(2) // the upload and the edit
    await new Promise((r) => setTimeout(r, 40))
    expect(changed).toHaveBeenCalledTimes(3) // and the vector computed afterwards
  })
})

describe('when the model is unavailable', () => {
  const offline: Embedder = { embed: async () => Promise.reject(new Error('offline')) }

  it('still relates built-in terms, from the shipped vectors', async () => {
    const { api } = setup(offline)
    await api.upload([
      { name: 'a.json', text: profile('React') },
      { name: 'b.json', text: profile('Vue') },
    ])
    expect((await api.graph()).related.length).toBeGreaterThan(0)
  })

  it('skips the category suggestion without failing, so the user can type one', async () => {
    const { api } = setup(offline)
    expect(await api.placement('Zig', 'skill', 'A systems language.')).toBeNull()
  })

  it('does not block confirming a definition, and keeps catalogue-position relatedness for it', async () => {
    const { api } = setup(offline)
    const out = await api.upload([{ name: 'a.json', text: profile('Zig', 'React') }])
    await expect(api.updateTerm(out.unresolved[0].id, { definition: 'A systems language.', category: 'Languages', section: 'technical' })).resolves.toBeTruthy()
    await tick()
    await expect(api.graph()).resolves.toBeTruthy()
  })

  it('suggests a category for a custom term when the model is available', async () => {
    const react = shipped.get('skill:react')!
    const { api } = setup({ embed: async (t) => t.map(() => react) })
    const p = await api.placement('Svelte', 'skill', 'A compiler for UI components')
    expect(p).toMatchObject({ section: 'technical' })
    expect(p!.category).toBeTruthy()
  })
})

describe('definition lookup from the browser', () => {
  const reply = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body })

  it('asks Wikipedia directly, with no key, and proposes a definition with its source', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (url) => {
      expect(url).toContain('en.wikipedia.org')
      return reply({ type: 'standard', title: 'Svelte', extract: 'Svelte is a free and open-source front-end framework.', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Svelte' } } })
    })
    const db = openDb()
    const api = createApi({ db, providers: defaultProviders(fetchImpl) })
    const out = await api.lookup('Svelte', 'skill', 'technical')
    expect(out.proposal).toMatchObject({ provider: 'Wikipedia', sourceUrl: 'https://en.wikipedia.org/wiki/Svelte' })
    expect(db.prepare('SELECT COUNT(*) AS n FROM term').get()).toEqual({ n: 0 }) // nothing saved by a lookup
    for (const [, init] of fetchImpl.mock.calls) expect(init?.headers).toEqual({ accept: 'application/json' })
  })

  it('reports a failed request as an error with no proposal, so the user can type a definition', async () => {
    const api = createApi({ db: openDb(), providers: defaultProviders(async () => Promise.reject(new Error('Failed to fetch'))) })
    const out = await api.lookup('Svelte', 'skill', 'technical')
    expect(out.proposal).toBeNull()
    expect(out.errors).toEqual([{ provider: 'Wikipedia', message: 'Failed to fetch' }])
  })

  it('reports a miss as no proposal and no error', async () => {
    const api = createApi({ db: openDb(), providers: defaultProviders(async () => reply({}, false, 404)) })
    const out = await api.lookup('Qwzxv', 'skill', 'technical')
    expect(out.proposal).toBeNull()
  })

  it('refuses a request with no term', async () => {
    const api = createApi({ db: openDb() })
    await expect(api.lookup('  ', 'skill', null)).rejects.toMatchObject({ status: 400 })
  })
})
