import { describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { openDb } from './db'
import { seedCatalogue } from './dictionary'
import { ensureEmbeddings, type Embedder } from './embeddings'
import { suggestPlacement } from './placement'

// Hand-made 2D "embeddings": x = frontend-ness, y = infrastructure-ness.
const AXES: Record<string, number[]> = {
  'React: UI library for components': [1, 0],
  'Vue: UI framework for components': [0.95, 0.05],
  'Angular: UI framework': [0.9, 0.1],
  'Docker: container platform': [0, 1],
  'Kubernetes: container orchestration': [0.05, 0.95],
  'Svelte: compiler based UI framework': [0.97, 0.03],
  'Nomad: workload orchestrator': [0.05, 0.9],
}
const embedder: Embedder = { embed: async (texts) => texts.map((t) => AXES[t] ?? [0.5, 0.5]) }

const term = (name: string, def: string, category: string) => ({
  name,
  kind: 'skill' as const,
  section: 'technical' as const,
  category,
  definition: def,
})

async function setup() {
  const db = openDb()
  seedCatalogue(db, {
    version: 1,
    terms: [
      term('React', 'UI library for components', 'Web and frontend'),
      term('Vue', 'UI framework for components', 'Web and frontend'),
      term('Angular', 'UI framework', 'Web and frontend'),
      term('Docker', 'container platform', 'Cloud and DevOps'),
      term('Kubernetes', 'container orchestration', 'Cloud and DevOps'),
    ],
  })
  await ensureEmbeddings(db, embedder)
  return db
}

describe('suggestPlacement', () => {
  it('suggests Web and frontend for Svelte', async () => {
    const db = await setup()
    const p = await suggestPlacement(db, embedder, {
      name: 'Svelte',
      kind: 'skill',
      definition: 'compiler based UI framework',
    })
    expect(p).toMatchObject({ category: 'Web and frontend', section: 'technical' })
    expect(p!.confidence).toBeGreaterThan(0.5)
    expect(p!.neighbours[0].name).toBe('Vue')
  })

  it('suggests Cloud and DevOps for an orchestrator', async () => {
    const db = await setup()
    const p = await suggestPlacement(db, embedder, { name: 'Nomad', kind: 'skill', definition: 'workload orchestrator' })
    expect(p?.category).toBe('Cloud and DevOps')
  })

  it('only compares with catalogue terms of the same kind', async () => {
    const db = await setup()
    expect(await suggestPlacement(db, embedder, { name: 'Courage', kind: 'value', definition: null })).toBeNull()
  })

  it('does not persist anything', async () => {
    const db = await setup()
    const before = (db.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n
    await suggestPlacement(db, embedder, { name: 'Svelte', kind: 'skill', definition: 'compiler based UI framework' })
    expect((db.prepare('SELECT COUNT(*) AS n FROM term').get() as { n: number }).n).toBe(before)
  })
})

describe('POST /api/terms/placement', () => {
  it('returns a suggestion, and 503 without an embedder', async () => {
    const db = await setup()
    const body = { name: 'Svelte', kind: 'skill', definition: 'compiler based UI framework' }
    const ok = await buildApp(db, { embedder }).inject({ method: 'POST', url: '/api/terms/placement', payload: body })
    expect(ok.statusCode).toBe(200)
    expect(ok.json().category).toBe('Web and frontend')

    const none = await buildApp(db).inject({ method: 'POST', url: '/api/terms/placement', payload: body })
    expect(none.statusCode).toBe(503)
  })

  it('persists placement only through the confirm (PATCH) step', async () => {
    const db = await setup()
    const app = buildApp(db, { embedder })
    db.prepare("INSERT INTO term (canonical, norm, kind, section, status) VALUES ('Svelte', 'svelte', 'skill', 'technical', 'undefined')").run()
    const id = (db.prepare("SELECT id FROM term WHERE norm = 'svelte'").get() as { id: number }).id
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/terms/${id}`,
      payload: { definition: 'compiler based UI framework', category: 'Web and frontend', section: 'technical' },
    })
    expect(res.json()).toMatchObject({ category: 'Web and frontend', status: 'confirmed' })
  })
})

