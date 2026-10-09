import type { GraphData } from '../shared/graph'

export type { GraphData }

export interface Individual {
  id: number
  name: string
  termCount: number
}

export interface UnresolvedTerm {
  id: number
  name: string
  kind: 'value' | 'skill'
  section: string | null
  suggestions: { id: number; name: string; reason: string }[]
}

export interface UploadResult {
  imported: { id: number; name: string }[]
  errors: { file: string; reason: string }[]
  conflicts: { file: string; name: string; existingId: number }[]
  unresolved: UnresolvedTerm[]
}

export interface DefinitionProposal {
  definition: string
  sourceUrl: string
  sourceTitle: string
  provider: string
}

export interface LookupOutcome {
  proposal: DefinitionProposal | null
  errors: { provider: string; message: string }[]
}

export interface Placement {
  section: string | null
  category: string
  confidence: number
}

export interface Term {
  id: number
  name: string
  kind: 'value' | 'skill'
  section: string | null
  category: string | null
  definition: string | null
  sourceUrl: string | null
  status: 'confirmed' | 'undefined'
  builtin: boolean
  individuals: number
}

export interface TermQuery {
  q?: string
  kind?: 'value' | 'skill'
  status?: 'confirmed' | 'undefined'
}

export interface TermEdit {
  definition?: string
  category?: string
  section?: string
  sourceUrl?: string
}

export type Resolution = 'replace' | 'keep'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (res.status === 204 ? undefined : await res.json()) as T
}

const send = (method: string, url: string, body?: unknown) =>
  fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

export const api = {
  listIndividuals: () => fetch('/api/individuals').then((r) => json<Individual[]>(r)),
  upload: (files: { name: string; text: string }[], resolutions?: Record<string, Resolution>) =>
    send('POST', '/api/individuals/upload', { files, resolutions }).then((r) => json<UploadResult>(r)),
  rename: (id: number, name: string) => send('PATCH', `/api/individuals/${id}`, { name }).then((r) => json<unknown>(r)),
  graph: () => fetch('/api/graph').then((r) => json<GraphData>(r)),
  lookup: (term: string, kind: 'value' | 'skill', section: string | null) =>
    send('POST', '/api/lookup', { term, kind, section }).then((r) => json<LookupOutcome>(r)),
  /** Suggested category for a custom term. Resolves null when the embedding model is unavailable. */
  placement: async (name: string, kind: 'value' | 'skill', definition: string | null) => {
    const res = await send('POST', '/api/terms/placement', { name, kind, definition })
    return res.ok ? ((await res.json()) as Placement) : null
  },
  addAlias: (termId: number, alias: string) => send('POST', `/api/terms/${termId}/aliases`, { alias }).then((r) => json<void>(r)),
  listTerms: (query: TermQuery = {}) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v)
    return fetch(`/api/terms?${params}`).then((r) => json<Term[]>(r))
  },
  updateTerm: (id: number, edit: TermEdit) => send('PATCH', `/api/terms/${id}`, edit).then((r) => json<Term>(r)),
  removeTerm: (id: number) => send('DELETE', `/api/terms/${id}`).then((r) => json<void>(r)),
  remove: (id: number) => send('DELETE', `/api/individuals/${id}`).then((r) => json<void>(r)),
}

export type Api = typeof api
