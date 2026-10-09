import type { Embedder } from './embeddings'

/** What the client needs from a Web Worker; a stub implements it in tests. */
export interface WorkerLike {
  postMessage(message: unknown): void
  addEventListener(type: 'message', listener: (e: { data: unknown }) => void): void
  addEventListener(type: 'error', listener: (e: { message?: string }) => void): void
  terminate(): void
}

export type EmbedderStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

/** Messages the worker sends back. `fatal` means the model itself could not be loaded. */
export type WorkerReply = { id: number; vectors: number[][] } | { id: number; error: string; fatal?: boolean }

/**
 * An Embedder that does its work in a worker and starts that worker, and so downloads the model, only the first
 * time something asks for an embedding. If the worker or the model cannot load, it becomes unavailable and every
 * request rejects straight away, so callers fall back to catalogue-position relatedness.
 */
export class LazyEmbedder implements Embedder {
  status: EmbedderStatus = 'idle'
  reason: string | undefined
  private worker: WorkerLike | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>()

  constructor(
    private readonly makeWorker: () => WorkerLike,
    private readonly onStatus?: (status: EmbedderStatus, reason?: string) => void,
  ) {}

  private set(status: EmbedderStatus, reason?: string) {
    this.status = status
    this.reason = reason
    this.onStatus?.(status, reason)
  }

  private fail(reason: string) {
    this.set('unavailable', reason)
    this.worker?.terminate()
    this.worker = null
    for (const p of this.pending.values()) p.reject(new Error(reason))
    this.pending.clear()
  }

  private start(): WorkerLike {
    if (this.worker) return this.worker
    this.set('loading')
    let worker: WorkerLike
    try {
      worker = this.makeWorker()
    } catch (e) {
      this.fail((e as Error).message)
      throw e
    }
    worker.addEventListener('message', (e) => {
      const reply = e.data as WorkerReply
      const job = this.pending.get(reply.id)
      if (!job) return
      this.pending.delete(reply.id)
      if ('vectors' in reply) {
        if (this.status === 'loading') this.set('ready')
        job.resolve(reply.vectors)
      } else if (reply.fatal) {
        job.reject(new Error(reply.error))
        this.fail(reply.error) // and everything still waiting
      } else {
        job.reject(new Error(reply.error))
      }
    })
    worker.addEventListener('error', (e) => this.fail(e.message ?? 'The language model worker failed to start'))
    this.worker = worker
    return worker
  }

  embed(texts: string[]): Promise<number[][]> {
    if (this.status === 'unavailable') return Promise.reject(new Error(this.reason ?? 'The language model is unavailable'))
    return new Promise((resolve, reject) => {
      try {
        const worker = this.start()
        const id = this.nextId++
        this.pending.set(id, { resolve, reject })
        worker.postMessage({ id, texts })
      } catch (e) {
        reject(e as Error)
      }
    })
  }
}
