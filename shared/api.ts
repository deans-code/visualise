import type { GraphData } from './graph'

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

/** Everything the interface asks of the data layer. In the app it is answered in the browser. */
export interface Api {
  listIndividuals(): Promise<Individual[]>
  upload(files: { name: string; text: string }[], resolutions?: Record<string, Resolution>): Promise<UploadResult>
  rename(id: number, name: string): Promise<unknown>
  remove(id: number): Promise<void>
  graph(): Promise<GraphData>
  lookup(term: string, kind: 'value' | 'skill', section: string | null): Promise<LookupOutcome>
  /** Suggested category for a custom term. Resolves null when the embedding model is unavailable. */
  placement(name: string, kind: 'value' | 'skill', definition: string | null): Promise<Placement | null>
  addAlias(termId: number, alias: string): Promise<void>
  listTerms(query?: TermQuery): Promise<Term[]>
  updateTerm(id: number, edit: TermEdit): Promise<Term>
  removeTerm(id: number): Promise<void>
  /** Remove every person and custom term and return the dictionary to the built-in catalogue. */
  clearAll(): Promise<void>
}
