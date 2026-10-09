import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openDb } from './db'
import { indexedDbStore, Persistence, type BlobStore, type SaveState, type StoredRecord } from './persistence'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const memoryStore = (initial?: StoredRecord) => {
  let record = initial
  const store: BlobStore & { writes: number; failNext: boolean } = {
    writes: 0,
    failNext: false,
    async read() {
      return record
    },
    async write(r) {
      if (store.failNext) throw new Error('quota exceeded')
      store.writes++
      record = r
    },
  }
  return store
}

const states = () => {
  const seen: SaveState[] = []
  return { seen, onState: (s: SaveState) => seen.push(s) }
}

describe('Persistence', () => {
  it('starts empty, then restores what was saved', async () => {
    const store = memoryStore()
    const bytes = new Uint8Array([1, 2, 3])
    const first = new Persistence(store, () => bytes)
    expect(await first.load()).toBeNull()
    first.schedule()
    await vi.advanceTimersByTimeAsync(300)

    const second = new Persistence(store, () => bytes)
    expect(await second.load()).toEqual(bytes)
    expect(second.version).toBe(1)
  })

  it('waits for a quiet moment, and saves a burst of changes once', async () => {
    const store = memoryStore()
    const p = new Persistence(store, () => new Uint8Array([1]), { delay: 300 })
    await p.load()
    for (let i = 0; i < 5; i++) {
      p.schedule()
      await vi.advanceTimersByTimeAsync(100)
    }
    expect(store.writes).toBe(0)
    await vi.advanceTimersByTimeAsync(300)
    expect(store.writes).toBe(1)
  })

  it('flushes immediately, for when the page is being hidden, and does nothing when nothing changed', async () => {
    const store = memoryStore()
    const p = new Persistence(store, () => new Uint8Array([9]))
    await p.load()
    await p.flush()
    expect(store.writes).toBe(0)
    p.schedule()
    await p.flush()
    expect(store.writes).toBe(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(store.writes).toBe(1)
  })

  it('reports a failed save, keeps the change pending, and recovers on the next change', async () => {
    const store = memoryStore()
    const { seen, onState } = states()
    const p = new Persistence(store, () => new Uint8Array([1]), { onState })
    await p.load()
    store.failNext = true
    p.schedule()
    await vi.advanceTimersByTimeAsync(300)
    expect(seen.at(-1)).toEqual({ kind: 'save-failed', reason: 'quota exceeded' })

    store.failNext = false
    p.schedule()
    await vi.advanceTimersByTimeAsync(300)
    expect(seen.at(-1)).toEqual({ kind: 'saved' })
    expect(store.writes).toBe(1)
  })

  it('works from memory, and says so, with no store or a store that cannot be read', async () => {
    const none = states()
    expect(await new Persistence(null, () => new Uint8Array(), none).load()).toBeNull()
    expect(none.seen[0]).toMatchObject({ kind: 'memory-only' })

    const broken = states()
    const store: BlobStore = {
      read: async () => {
        throw new Error('blocked')
      },
      write: async () => {},
    }
    expect(await new Persistence(store, () => new Uint8Array(), broken).load()).toBeNull()
    expect(broken.seen[0]).toEqual({ kind: 'memory-only', reason: 'blocked' })
  })

  it('does not try to save with no store', async () => {
    const p = new Persistence(null, () => new Uint8Array())
    p.schedule()
    await vi.advanceTimersByTimeAsync(1000)
    await expect(p.flush()).resolves.toBeUndefined()
  })

  it('notices a newer copy saved by another tab, and not its own', async () => {
    const store = memoryStore()
    const mine = new Persistence(store, () => new Uint8Array([1]))
    await mine.load()
    mine.schedule()
    await vi.advanceTimersByTimeAsync(300)
    expect(await mine.newerCopy()).toBeNull()

    const other = new Persistence(store, () => new Uint8Array([2]))
    await other.load()
    other.schedule()
    await vi.advanceTimersByTimeAsync(300)

    const newer = await mine.newerCopy()
    expect(newer?.bytes).toEqual(new Uint8Array([2]))
    mine.adopt(newer!)
    expect(await mine.newerCopy()).toBeNull()
  })

  it('asks the browser for persistent storage once, after the first save', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('navigator', { storage: { persist } })
    const store = memoryStore()
    const p = new Persistence(store, () => new Uint8Array([1]))
    await p.load()
    for (let i = 0; i < 3; i++) {
      p.schedule()
      await vi.advanceTimersByTimeAsync(300)
    }
    expect(persist).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})

describe('IndexedDB store', () => {
  it('keeps a real database across a "reload" (a new store on the same name)', async () => {
    vi.useRealTimers()
    const db = openDb()
    db.prepare('INSERT INTO individual (name) VALUES (?)').run('alex')
    await indexedDbStore('test-reload').write({ bytes: db.export(), version: 4 })

    const record = await indexedDbStore('test-reload').read()
    expect(record?.version).toBe(4)
    expect(openDb(record!.bytes).prepare('SELECT name FROM individual').all()).toEqual([{ name: 'alex' }])
  })

  it('reads nothing from an empty store, and rejects when IndexedDB does not exist', async () => {
    vi.useRealTimers()
    expect(await indexedDbStore('test-empty').read()).toBeUndefined()

    const real = globalThis.indexedDB
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB
    try {
      await expect(indexedDbStore('test-missing').read()).rejects.toThrow(/not available/)
    } finally {
      globalThis.indexedDB = real
    }
  })
})
