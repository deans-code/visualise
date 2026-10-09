import Fastify from 'fastify'
import type { Db } from './db'
import { registerIndividualRoutes } from './individuals'

export function buildApp(db: Db) {
  const app = Fastify({ logger: false })
  app.decorate('db', db)

  app.get('/api/health', async () => ({ ok: true }))
  registerIndividualRoutes(app)

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}
