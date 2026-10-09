import type { Api } from '../shared/api'
import { startApi } from './engine'

export type {
  Api,
  DefinitionProposal,
  GraphData,
  Individual,
  LookupOutcome,
  Placement,
  Resolution,
  Term,
  TermEdit,
  TermQuery,
  UnresolvedTerm,
  UploadResult,
} from '../shared/api'

let started: Promise<Api> | null = null
/** Open the in-browser data layer once. Rejects if the browser cannot run it. */
export const start = () => (started ??= startApi())

/** The interface's data layer. Every call waits for `start()`, so components can use it straight away. */
export const api: Api = {
  listIndividuals: async () => (await start()).listIndividuals(),
  upload: async (files, resolutions) => (await start()).upload(files, resolutions),
  rename: async (id, name) => (await start()).rename(id, name),
  remove: async (id) => (await start()).remove(id),
  graph: async () => (await start()).graph(),
  lookup: async (term, kind, section) => (await start()).lookup(term, kind, section),
  placement: async (name, kind, definition) => (await start()).placement(name, kind, definition),
  addAlias: async (termId, alias) => (await start()).addAlias(termId, alias),
  listTerms: async (query) => (await start()).listTerms(query),
  updateTerm: async (id, edit) => (await start()).updateTerm(id, edit),
  removeTerm: async (id) => (await start()).removeTerm(id),
  clearAll: async () => (await start()).clearAll(),
}
