import { describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { openDb, type Db } from './db'
import { seedCatalogue } from './dictionary'
import { ensureEmbeddings, type Embedder } from './embeddings'

const skill = (name: string, section: string, category: string) => ({
  name,
  kind: 'skill' as const,
  section: section as 'technical',
  category,
  definition: `${name} definition`,
})

const catalogue = {
  version: 1,
  terms: [
    skill('React', 'technical', 'Web and frontend'),
    skill('Vue', 'technical', 'Web and frontend'),
    skill('Kubernetes', 'technical', 'Cloud and DevOps'),
    skill('Docker', 'technical', 'Cloud and DevOps'),
    skill('Rust', 'technical', 'Languages'),
  ],
}

const profile = (experience: string[]) => JSON.stringify({ values: [], skills: { technical: { experience, desired: [] } } })

async function setup(embedder?: Embedder) {
  const db: Db = openDb()
  seedCatalogue(db, catalogue)
  if (embedder) await ensureEmbeddings(db, embedder)
  const app = buildApp(db)
  await app.inject({
    method: 'POST',
    url: '/api/individuals/upload',
    payload: { files: [{ name: 'a.json', text: profile(['React', 'Rust']) }, { name: 'b.json', text: profile(['Vue', 'Docker']) }] },
  })
  return app
}

const get = async (app: Awaited<ReturnType<typeof setup>>) => (await app.inject({ url: '/api/graph' })).json()
const names = (g: { terms: { id: number; name: string }[] }, id: number) => g.terms.find((t) => t.id === id)!.name

describe('GET /api/graph', () => {
  it('returns people, the terms they use, and their links', async () => {
    const g = await get(await setup())
    expect(g.people.map((p: { name: string }) => p.name)).toEqual(['a', 'b'])
    expect(g.terms.map((t: { name: string }) => t.name).sort()).toEqual(['Docker', 'React', 'Rust', 'Vue'])
    expect(g.links).toHaveLength(4)
    expect(g.links.every((l: { role: string }) => l.role === 'experience')).toBe(true)
  })

  it('without embeddings, reports only same-category pairs', async () => {
    const g = await get(await setup())
    const pairs = g.related.map((r: { a: number; b: number }) => [names(g, r.a), names(g, r.b)].sort().join('/'))
    expect(pairs).toEqual(['React/Vue'])
    expect(g.related[0].reasons).toEqual(['same category: Web and frontend'])
  })

  it('with embeddings, adds cross-category pairs whose definitions are close', async () => {
    // Docker (cloud) is made to look like Rust (languages) in embedding space; React and Vue likewise.
    const vec: Record<string, number[]> = {
      'React: React definition': [1, 0, 0],
      'Vue: Vue definition': [0.95, 0.05, 0],
      'Docker: Docker definition': [0, 1, 0],
      'Rust: Rust definition': [0.05, 0.95, 0],
      'Kubernetes: Kubernetes definition': [0, 0, 1],
    }
    const g = await get(await setup({ embed: async (ts) => ts.map((t) => vec[t]) }))
    const pairs = g.related.map((r: { a: number; b: number }) => [names(g, r.a), names(g, r.b)].sort().join('/')).sort()
    expect(pairs).toContain('React/Vue')
    expect(pairs).toContain('Docker/Rust')
    expect(pairs).not.toContain('Docker/React')
    const dr = g.related.find((r: { a: number; b: number }) => [names(g, r.a), names(g, r.b)].sort().join('/') === 'Docker/Rust')
    expect(dr.reasons).toEqual(['same section: technical', 'similar definitions'])
  })

  it('is empty when nobody has uploaded', async () => {
    const app = buildApp(openDb())
    expect((await app.inject({ url: '/api/graph' })).json()).toEqual({ people: [], terms: [], links: [], related: [] })
  })
})
