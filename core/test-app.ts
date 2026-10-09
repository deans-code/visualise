import { createApi } from './api'
import type { Db } from './db'
import type { Embedder } from './embeddings'
import { ApiError } from './errors'
import type { DefinitionProvider } from './lookup'
import { listTerms, placement, suggestTerms } from './terms'

interface Response {
  statusCode: number
  json: () => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface Request {
  method?: string
  url: string
  payload?: unknown
}

/**
 * Test helper only: drives the real in-browser Api with HTTP-shaped requests and returns HTTP-shaped answers
 * (status code plus JSON), so tests can state the contract (400 for bad input, 404 for a missing row) the same way
 * the old server's tests did. The application itself never builds URLs: its interface calls the Api directly.
 */
export function buildApp(db: Db, options: { embedder?: Embedder | null; providers?: DefinitionProvider[] } = {}) {
  const api = createApi({ db, providers: options.providers, embedder: () => options.embedder ?? null })

  async function dispatch(req: Request): Promise<{ status: number; body?: unknown }> {
    const url = new URL(req.url, 'http://x')
    const path = url.pathname
    const method = (req.method ?? 'GET').toUpperCase()
    const body = (req.payload ?? {}) as Record<string, unknown>
    const id = Number(path.split('/')[path.startsWith('/api/terms/') || path.startsWith('/api/individuals/') ? 3 : 0])

    if (method === 'POST' && path === '/api/individuals/upload') {
      return { status: 200, body: await api.upload(body.files as never, body.resolutions as never) }
    }
    if (method === 'GET' && path === '/api/individuals') return { status: 200, body: await api.listIndividuals() }
    if (path.startsWith('/api/individuals/') && method === 'PATCH') return { status: 200, body: await api.rename(id, body.name as string) }
    if (path.startsWith('/api/individuals/') && method === 'DELETE') return await api.remove(id).then(() => ({ status: 204 }))
    if (method === 'GET' && path === '/api/graph') return { status: 200, body: await api.graph() }
    if (method === 'GET' && path === '/api/terms') {
      return { status: 200, body: listTerms(db, Object.fromEntries(url.searchParams)) }
    }
    if (method === 'GET' && path === '/api/terms/suggest') {
      return { status: 200, body: suggestTerms(db, url.searchParams.get('term') ?? undefined, url.searchParams.get('kind') ?? undefined) }
    }
    if (method === 'POST' && path === '/api/lookup') {
      return { status: 200, body: await api.lookup(body.term as string, body.kind as 'skill', (body.section as string) ?? null) }
    }
    if (method === 'POST' && path === '/api/terms/placement') {
      return { status: 200, body: await placement(db, options.embedder ?? null, body) }
    }
    if (method === 'POST' && /^\/api\/terms\/\d+\/aliases$/.test(path)) {
      return await api.addAlias(id, body.alias as string).then(() => ({ status: 204 }))
    }
    if (method === 'PATCH' && /^\/api\/terms\/\d+$/.test(path)) return { status: 200, body: await api.updateTerm(id, body) }
    if (method === 'DELETE' && /^\/api\/terms\/\d+$/.test(path)) return await api.removeTerm(id).then(() => ({ status: 204 }))
    return { status: 404, body: { error: 'Not found' } }
  }

  return {
    api,
    async inject(req: Request): Promise<Response> {
      try {
        const out = await dispatch(req)
        return { statusCode: out.status, json: () => out.body }
      } catch (e) {
        if (e instanceof ApiError) return { statusCode: e.status, json: () => ({ error: e.message }) }
        throw e
      }
    },
  }
}
