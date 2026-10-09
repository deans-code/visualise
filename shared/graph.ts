import { SECTIONS, type Section } from './profile'
import type { TermInfo } from './relatedness'

/** Everything the visualisation needs, as served by GET /api/graph. */
export interface GraphTerm extends TermInfo {
  definition: string | null
}

export type Role = 'value' | 'experience' | 'desired'

export interface GraphData {
  people: { id: number; name: string }[]
  /** Only terms that at least one person has. */
  terms: GraphTerm[]
  links: { person: number; term: number; role: Role }[]
  /** Pairs of distinct terms that are related enough to matter. Pairs not listed are unrelated. */
  related: { a: number; b: number; score: number; reasons: string[] }[]
}

/** What an edge between two people is built from. */
export type Basis = 'values' | 'experience' | 'desired' | 'complementary'

export interface Filters {
  basis: Basis
  /** Skill sections to include. Values are not skills, so this does not affect the values basis. */
  sections: Section[]
  /** 0 counts exact matches only; 1 counts related terms at their full relatedness. */
  adjacency: number
  /** Edges weaker than this are hidden. */
  threshold: number
  /** When not empty, only these terms are considered. */
  focus: number[]
}

export const DEFAULT_FILTERS: Filters = {
  basis: 'experience',
  sections: [...SECTIONS],
  adjacency: 0.5,
  threshold: 0.25,
  focus: [],
}

export interface GraphIndex {
  data: GraphData
  term: Map<number, GraphTerm>
  person: Map<number, { id: number; name: string }>
  /** person id -> role -> term ids */
  has: Map<number, Record<Role, number[]>>
  relatedScore(a: number, b: number): number
  relatedReasons(a: number, b: number): string[]
}

const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)

export function buildIndex(data: GraphData): GraphIndex {
  const pairs = new Map<string, { score: number; reasons: string[] }>()
  for (const r of data.related) pairs.set(pairKey(r.a, r.b), { score: r.score, reasons: r.reasons })

  const has = new Map<number, Record<Role, number[]>>()
  for (const p of data.people) has.set(p.id, { value: [], experience: [], desired: [] })
  for (const l of data.links) has.get(l.person)?.[l.role].push(l.term)

  return {
    data,
    term: new Map(data.terms.map((t) => [t.id, t])),
    person: new Map(data.people.map((p) => [p.id, p])),
    has,
    relatedScore: (a, b) => (a === b ? 1 : (pairs.get(pairKey(a, b))?.score ?? 0)),
    relatedReasons: (a, b) => (a === b ? ['same term'] : (pairs.get(pairKey(a, b))?.reasons ?? [])),
  }
}

/** How much a pair of terms counts under the current adjacency setting. */
export function effectiveScore(index: GraphIndex, a: number, b: number, adjacency: number): number {
  if (a === b) return 1
  if (adjacency <= 0) return 0
  return adjacency * index.relatedScore(a, b)
}

function allowed(index: GraphIndex, termId: number, filters: Filters, ignoreSections: boolean): boolean {
  if (filters.focus.length > 0 && !filters.focus.includes(termId)) return false
  if (ignoreSections) return true
  const section = index.term.get(termId)?.section as Section | null | undefined
  return !!section && filters.sections.includes(section)
}

/** The terms of one person that count for a role under the current filters. */
export function termsOf(index: GraphIndex, personId: number, role: Role, filters: Filters): number[] {
  const ids = index.has.get(personId)?.[role] ?? []
  return ids.filter((t) => allowed(index, t, filters, role === 'value'))
}

const roleFor = (basis: Basis): Role | null =>
  basis === 'values' ? 'value' : basis === 'experience' ? 'experience' : basis === 'desired' ? 'desired' : null

export interface TermMatch {
  a: number
  b: number
  /** Effective score: 1 for the same term, otherwise relatedness scaled by the adjacency setting. */
  score: number
  reasons: string[]
}

export interface Overlap {
  /** 0 to 1. Equals the Dice coefficient when every match is exact. */
  similarity: number
  exact: number[]
  related: TermMatch[]
}

/**
 * Soft overlap of two term sets: every term is matched to its best counterpart on the other side, and the
 * scores are averaged over both sets. Exact matches count fully; related terms count by relatedness.
 */
export function softOverlap(index: GraphIndex, a: number[], b: number[], adjacency: number): Overlap {
  if (a.length === 0 || b.length === 0) return { similarity: 0, exact: [], related: [] }

  let total = 0
  const related = new Map<string, TermMatch>()
  const best = (from: number[], to: number[], flip: boolean) => {
    for (const x of from) {
      let top = 0
      let topY = -1
      for (const y of to) {
        const s = effectiveScore(index, x, y, adjacency)
        if (s > top) {
          top = s
          topY = y
        }
      }
      total += top
      if (top > 0 && topY !== x) {
        const [ma, mb] = flip ? [topY, x] : [x, topY]
        related.set(`${ma}:${mb}`, { a: ma, b: mb, score: top, reasons: index.relatedReasons(ma, mb) })
      }
    }
  }
  best(a, b, false)
  best(b, a, true)

  const inB = new Set(b)
  return {
    similarity: total / (a.length + b.length),
    exact: a.filter((t) => inB.has(t)),
    related: [...related.values()].sort((p, q) => q.score - p.score),
  }
}

export interface SimilarityEdge {
  a: number
  b: number
  similarity: number
  overlap: Overlap
}

/** Undirected edges between people for the values / experience / desired bases. */
export function similarityEdges(index: GraphIndex, filters: Filters): SimilarityEdge[] {
  const role = roleFor(filters.basis)
  if (!role) return []
  const people = index.data.people
  const sets = new Map(people.map((p) => [p.id, termsOf(index, p.id, role, filters)]))

  const edges: SimilarityEdge[] = []
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const overlap = softOverlap(index, sets.get(people[i].id)!, sets.get(people[j].id)!, filters.adjacency)
      if (overlap.similarity > 0 && overlap.similarity >= filters.threshold) {
        edges.push({ a: people[i].id, b: people[j].id, similarity: overlap.similarity, overlap })
      }
    }
  }
  return edges
}

export interface HelpItem {
  experience: number
  desired: number
  score: number
  /** True when the experienced term is related to, not the same as, the desired one. */
  approximate: boolean
}

export interface HelpLink {
  /** Has the experience. */
  from: number
  /** Wants it. */
  to: number
  weight: number
  items: HelpItem[]
}

/** Directed "could help" links: A has experience in something B lists as desired (exactly or approximately). */
export function helpLinks(index: GraphIndex, filters: Filters): HelpLink[] {
  const people = index.data.people
  const minScore = Math.max(filters.threshold, 0.01)
  const experience = new Map(people.map((p) => [p.id, termsOf(index, p.id, 'experience', filters)]))
  const desired = new Map(people.map((p) => [p.id, termsOf(index, p.id, 'desired', filters)]))

  const links: HelpLink[] = []
  for (const from of people) {
    for (const to of people) {
      if (from.id === to.id) continue
      const items: HelpItem[] = []
      for (const d of desired.get(to.id)!) {
        let top = 0
        let topE = -1
        for (const e of experience.get(from.id)!) {
          const s = effectiveScore(index, e, d, filters.adjacency)
          if (s > top) {
            top = s
            topE = e
          }
        }
        if (top >= minScore) items.push({ experience: topE, desired: d, score: top, approximate: topE !== d })
      }
      if (items.length > 0) {
        items.sort((x, y) => y.score - x.score)
        links.push({ from: from.id, to: to.id, weight: items.reduce((s, i) => s + i.score, 0), items })
      }
    }
  }
  return links
}

export interface CategoryRow {
  /** Stable key: "values:<category>" or "<section>:<category>". */
  key: string
  /** Skill section, or null for values. */
  section: string | null
  category: string
}

export interface CategoryProfile {
  rows: CategoryRow[]
  /** person id -> category key -> number of that person's terms in it */
  counts: Map<number, Map<string, number>>
  /** Cosine similarity of two people's category-count vectors, 0 to 1. */
  similarity(a: number, b: number): number
}

/**
 * Each person as a spread over the catalogue's categories: how many of their terms (for the current basis)
 * fall in each. Two people who chose different terms from the same category still land in the same place,
 * so this shows closeness that exact or even related-term matching can miss.
 */
export function categoryProfile(index: GraphIndex, filters: Filters): CategoryProfile {
  const role: Role = filters.basis === 'values' ? 'value' : filters.basis === 'desired' ? 'desired' : 'experience'
  const keyOf = (t: GraphTerm) => `${t.kind === 'value' ? 'values' : (t.section ?? 'other')}:${t.category ?? 'Uncategorised'}`

  const rows = new Map<string, CategoryRow>()
  const counts = new Map<number, Map<string, number>>()
  for (const p of index.data.people) {
    const mine = new Map<string, number>()
    for (const id of termsOf(index, p.id, role, filters)) {
      const t = index.term.get(id)!
      const key = keyOf(t)
      mine.set(key, (mine.get(key) ?? 0) + 1)
      if (!rows.has(key)) {
        rows.set(key, { key, section: t.kind === 'value' ? null : t.section, category: t.category ?? 'Uncategorised' })
      }
    }
    counts.set(p.id, mine)
  }

  const sorted = [...rows.values()].sort(
    (a, b) => (a.section === null ? -1 : 0) - (b.section === null ? -1 : 0) || (a.section ?? '').localeCompare(b.section ?? '') || a.category.localeCompare(b.category),
  )

  const similarity = (a: number, b: number) => {
    const va = counts.get(a)!
    const vb = counts.get(b)!
    let dot = 0
    let na = 0
    let nb = 0
    for (const [k, n] of va) {
      na += n * n
      dot += n * (vb.get(k) ?? 0)
    }
    for (const n of vb.values()) nb += n * n
    return na && nb ? dot / Math.sqrt(na * nb) : 0
  }
  return { rows: sorted, counts, similarity }
}
