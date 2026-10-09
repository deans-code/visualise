import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openDb, type Db } from './db'
import { seedCatalogue } from './dictionary'
import { cosine, ensureEmbeddings, loadEmbeddings, type Embedder } from './embeddings'

let db: Db
beforeEach(() => {
  db = openDb()
  seedCatalogue(db, {
    version: 1,
    terms: [
      { name: 'React', kind: 'skill', section: 'technical', category: 'Web', definition: 'UI library' },
      { name: 'Vue', kind: 'skill', section: 'technical', category: 'Web', definition: 'UI framework' },
    ],
  })
})

// Deterministic stub: vector derived from the text length.
const stub = (): Embedder & { embed: ReturnType<typeof vi.fn> } => ({
  embed: vi.fn(async (texts: string[]) => texts.map((t) => [t.length, 1])),
})

describe('ensureEmbeddings', () => {
  it('embeds each term once and caches the vector', async () => {
    const e = stub()
    expect(await ensureEmbeddings(db, e)).toBe(2)
    expect(e.embed).toHaveBeenCalledWith(['React: UI library', 'Vue: UI framework'])
    expect(loadEmbeddings(db).size).toBe(2)

    expect(await ensureEmbeddings(db, e)).toBe(0)
    expect(e.embed).toHaveBeenCalledTimes(1)
  })

  it('re-embeds a term after its definition is cleared', async () => {
    const e = stub()
    await ensureEmbeddings(db, e)
    db.prepare("UPDATE term SET embedding = NULL WHERE canonical = 'Vue'").run()
    expect(await ensureEmbeddings(db, e)).toBe(1)
  })
})

describe('cosine', () => {
  it('is 1 for parallel and 0 for orthogonal vectors', () => {
    expect(cosine([1, 2], [2, 4])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })
})
