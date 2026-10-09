/// <reference lib="webworker" />
import type { WorkerReply } from '../core/embedder-client'
import { EMBEDDING_MODEL } from '../core/embeddings'

/**
 * Runs the sentence-embedding model off the main thread. The library, and so the model files (from the model
 * host) and the runtime, are fetched only when this worker is first asked for an embedding.
 */
type Extractor = (texts: string[], options: { pooling: 'mean'; normalize: boolean }) => Promise<{ tolist(): number[][] }>
let extractor: Promise<Extractor> | null = null

function load(): Promise<Extractor> {
  return (extractor ??= import('@huggingface/transformers').then(
    async ({ pipeline, env }) => {
      env.allowLocalModels = false // nothing to find on this site; go straight to the model host
      return (await pipeline('feature-extraction', EMBEDDING_MODEL)) as unknown as Extractor
    },
  ))
}

self.addEventListener('message', async (e: MessageEvent<{ id: number; texts: string[] }>) => {
  const { id, texts } = e.data
  let model: Extractor
  try {
    model = await load()
  } catch (err) {
    extractor = null // a later request may try again, for example once the network is back
    self.postMessage({ id, error: `The language model could not be loaded: ${(err as Error).message}`, fatal: true } satisfies WorkerReply)
    return
  }
  try {
    const out = await model(texts, { pooling: 'mean', normalize: true })
    self.postMessage({ id, vectors: out.tolist() } satisfies WorkerReply)
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message } satisfies WorkerReply)
  }
})
