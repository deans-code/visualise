import { vi } from 'vitest'
import type { Api } from './api'

/** An Api whose every method is a mock. Pass overrides for the calls a test cares about. */
export function makeApi(over: Partial<Api> = {}): Api {
  return {
    listIndividuals: vi.fn().mockResolvedValue([]),
    upload: vi.fn().mockResolvedValue({ imported: [], errors: [], conflicts: [], unresolved: [] }),
    rename: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
    graph: vi.fn().mockResolvedValue({ people: [], terms: [], links: [], related: [] }),
    lookup: vi.fn().mockResolvedValue({ proposal: null, errors: [] }),
    placement: vi.fn().mockResolvedValue(null),
    addAlias: vi.fn().mockResolvedValue(undefined),
    listTerms: vi.fn().mockResolvedValue([]),
    updateTerm: vi.fn().mockResolvedValue({}),
    removeTerm: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
    ...over,
  }
}
