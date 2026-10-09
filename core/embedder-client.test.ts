import { describe, expect, it, vi } from 'vitest'
import { LazyEmbedder, type EmbedderStatus, type WorkerLike, type WorkerReply } from './embedder-client'

/** A worker whose replies the test controls. */
function stubWorker() {
  const listeners: { message: ((e: { data: unknown }) => void)[]; error: ((e: { message?: string }) => void)[] } = { message: [], error: [] }
  const sent: { id: number; texts: string[] }[] = []
  const worker: WorkerLike & { terminated: boolean } = {
    terminated: false,
    postMessage: (m) => sent.push(m as { id: number; texts: string[] }),
    addEventListener: ((type: 'message' | 'error', fn: never) => listeners[type].push(fn)) as WorkerLike['addEventListener'],
    terminate: () => {
      worker.terminated = true
    },
  }
  return {
    worker,
    sent,
    reply: (r: WorkerReply) => listeners.message.forEach((l) => l({ data: r })),
    crash: (message: string) => listeners.error.forEach((l) => l({ message })),
  }
}

describe('LazyEmbedder', () => {
  it('does not start a worker, or touch the model, until the first request', () => {
    const make = vi.fn(() => stubWorker().worker)
    const e = new LazyEmbedder(make)
    expect(e.status).toBe('idle')
    expect(make).not.toHaveBeenCalled()
  })

  it('starts one worker on first use, reports loading then ready, and returns the vectors', async () => {
    const stub = stubWorker()
    const make = vi.fn(() => stub.worker)
    const seen: EmbedderStatus[] = []
    const e = new LazyEmbedder(make, (s) => seen.push(s))

    const first = e.embed(['a', 'b'])
    expect(e.status).toBe('loading')
    expect(stub.sent[0].texts).toEqual(['a', 'b'])
    stub.reply({ id: stub.sent[0].id, vectors: [[1], [2]] })
    expect(await first).toEqual([[1], [2]])
    expect(e.status).toBe('ready')

    const second = e.embed(['c'])
    stub.reply({ id: stub.sent[1].id, vectors: [[3]] })
    expect(await second).toEqual([[3]])
    expect(make).toHaveBeenCalledTimes(1)
    expect(seen).toEqual(['loading', 'ready'])
  })

  it('matches replies to their requests when several are in flight', async () => {
    const stub = stubWorker()
    const e = new LazyEmbedder(() => stub.worker)
    const a = e.embed(['a'])
    const b = e.embed(['b'])
    stub.reply({ id: stub.sent[1].id, vectors: [[2]] })
    stub.reply({ id: stub.sent[0].id, vectors: [[1]] })
    expect(await a).toEqual([[1]])
    expect(await b).toEqual([[2]])
  })

  it('becomes unavailable when the model cannot load, and rejects everything after at once', async () => {
    const stub = stubWorker()
    const e = new LazyEmbedder(() => stub.worker)
    const waiting = e.embed(['a'])
    const other = e.embed(['b'])
    stub.reply({ id: stub.sent[0].id, error: 'offline', fatal: true })
    await expect(waiting).rejects.toThrow('offline')
    await expect(other).rejects.toThrow('offline')
    expect(e.status).toBe('unavailable')
    expect(e.reason).toBe('offline')
    expect(stub.worker.terminated).toBe(true)

    await expect(e.embed(['c'])).rejects.toThrow('offline')
    expect(stub.sent).toHaveLength(2) // nothing more was sent
  })

  it('becomes unavailable when the worker script itself fails to start', async () => {
    const stub = stubWorker()
    const e = new LazyEmbedder(() => stub.worker)
    const p = e.embed(['a'])
    stub.crash('Failed to fetch worker')
    await expect(p).rejects.toThrow('Failed to fetch worker')
    expect(e.status).toBe('unavailable')
  })

  it('becomes unavailable when a worker cannot even be created', async () => {
    const e = new LazyEmbedder(() => {
      throw new Error('Workers are blocked')
    })
    await expect(e.embed(['a'])).rejects.toThrow('Workers are blocked')
    expect(e.status).toBe('unavailable')
  })

  it('a single failed request does not make the model unavailable', async () => {
    const stub = stubWorker()
    const e = new LazyEmbedder(() => stub.worker)
    const p = e.embed(['a'])
    stub.reply({ id: stub.sent[0].id, error: 'bad input' })
    await expect(p).rejects.toThrow('bad input')
    expect(e.status).toBe('loading')
    const q = e.embed(['b'])
    stub.reply({ id: stub.sent[1].id, vectors: [[1]] })
    expect(await q).toEqual([[1]])
    expect(e.status).toBe('ready')
  })
})
