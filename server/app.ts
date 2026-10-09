import Fastify from 'fastify'
import type { Db } from './db'
import type { Embedder } from './embeddings'
import { registerIndividualRoutes } from './individuals'
import { registerTermRoutes } from './terms'

export interface AppOptions {
  /** Embeds definitions for placing custom terms. Null/absent disables the feature. */
  embedder?: Embedder | null
}

export function buildApp(db: Db, options: AppOptions = {}) {
  const app = Fastify({ logger: false })
  app.decorate('db', db)
  app.decorate('embedder', { getter: () => options.embedder ?? null })

  app.get('/api/health', async () => ({ ok: true }))
  registerIndividualRoutes(app)
  registerTermRoutes(app)

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    embedder: Embedder | null
  }
}
