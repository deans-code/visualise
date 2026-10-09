import { describe, expect, it } from 'vitest'
import {
  buildIndex,
  categoryProfile,
  DEFAULT_FILTERS,
  helpLinks,
  similarityEdges,
  softOverlap,
  type Filters,
  type GraphData,
  type Role,
} from './graph'

const t = (id: number, name: string, kind: 'value' | 'skill', section: string | null, category: string) => ({
  id,
  name,
  kind,
  section,
  category,
  definition: null,
})

const REACT = 1
const VUE = 2
const KUBE = 3
const RUST = 4
const MENTORING = 5
const TRUST = 6

const person = (id: number, name: string) => ({ id, name })
const link = (p: number, term: number, role: Role) => ({ person: p, term, role })

// Alex: React.  Bo: Vue (adjacent to React).  Cy: React + Vue.  Di: Mentoring + Trust (unrelated to the rest).
const data: GraphData = {
  people: [person(1, 'Alex'), person(2, 'Bo'), person(3, 'Cy'), person(4, 'Di')],
  terms: [
    t(REACT, 'React', 'skill', 'technical', 'Web and frontend'),
    t(VUE, 'Vue', 'skill', 'technical', 'Web and frontend'),
    t(KUBE, 'Kubernetes', 'skill', 'technical', 'Cloud and DevOps'),
    t(RUST, 'Rust', 'skill', 'technical', 'Languages'),
    t(MENTORING, 'Mentoring', 'skill', 'interpersonal', 'Leadership'),
    t(TRUST, 'Trust', 'value', null, 'Relationships and community'),
  ],
  links: [
    link(1, REACT, 'experience'),
    link(2, VUE, 'experience'),
    link(3, REACT, 'experience'),
    link(3, VUE, 'experience'),
    link(4, MENTORING, 'experience'),
    link(4, TRUST, 'value'),
    link(1, TRUST, 'value'),
    // Alex wants Rust and Kubernetes; Bo wants React; Di wants Vue.
    link(1, RUST, 'desired'),
    link(1, KUBE, 'desired'),
    link(2, REACT, 'desired'),
    link(4, VUE, 'desired'),
    link(2, RUST, 'experience'),
  ],
  related: [{ a: REACT, b: VUE, score: 1, reasons: ['same category: Web and frontend', 'similar definitions'] }],
}

const index = buildIndex(data)
const filters = (over: Partial<Filters> = {}): Filters => ({ ...DEFAULT_FILTERS, ...over })
const edge = (edges: ReturnType<typeof similarityEdges>, a: number, b: number) =>
  edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))

describe('softOverlap', () => {
  it('equals Dice on exact matches only', () => {
    // {React, Vue} vs {React}: 2 * 1 / 3
    expect(softOverlap(index, [REACT, VUE], [REACT], 0).similarity).toBeCloseTo(2 / 3)
  })

  it('counts a related term partly, scaled by adjacency', () => {
    const full = softOverlap(index, [REACT], [VUE], 1)
    const part = softOverlap(index, [REACT], [VUE], 0.5)
    expect(full.similarity).toBeCloseTo(1)
    expect(part.similarity).toBeCloseTo(0.5)
    expect(full.related).toMatchObject([{ a: REACT, b: VUE, score: 1 }])
  })

  it('is zero for exact-only when nothing is shared', () => {
    expect(softOverlap(index, [REACT], [VUE], 0)).toEqual({ similarity: 0, exact: [], related: [] })
  })

  it('is zero if either side is empty, and symmetric otherwise', () => {
    expect(softOverlap(index, [], [REACT], 1).similarity).toBe(0)
    expect(softOverlap(index, [REACT, KUBE], [VUE], 0.7).similarity).toBeCloseTo(
      softOverlap(index, [VUE], [REACT, KUBE], 0.7).similarity,
    )
  })

  it('lists exact matches separately from related ones, with reasons', () => {
    const o = softOverlap(index, [REACT, VUE], [REACT], 1)
    expect(o.exact).toEqual([REACT])
    expect(o.related[0].reasons).toContain('same category: Web and frontend')
  })
})

describe('similarityEdges', () => {
  it('connects Alex and Cy strongly (shared React), Alex and Bo weakly (React ~ Vue), and leaves Di isolated', () => {
    const edges = similarityEdges(index, filters({ threshold: 0.1 }))
    const strong = edge(edges, 1, 3)!
    const weak = edge(edges, 1, 2)!
    expect(strong.similarity).toBeGreaterThan(weak.similarity)
    expect(weak.overlap.exact).toEqual([])
    expect(weak.overlap.related).toHaveLength(1)
    expect(edges.some((e) => e.a === 4 || e.b === 4)).toBe(false)
  })

  it('drops the adjacent-only edge at exact-only adjacency', () => {
    const edges = similarityEdges(index, filters({ adjacency: 0, threshold: 0.1 }))
    expect(edge(edges, 1, 2)).toBeUndefined()
    expect(edge(edges, 1, 3)).toBeDefined()
  })

  it('hides edges under the threshold', () => {
    const edges = similarityEdges(index, filters({ threshold: 0.95 }))
    expect(edges).toEqual([])
  })

  it('uses only values for the values basis', () => {
    const edges = similarityEdges(index, filters({ basis: 'values', threshold: 0.1 }))
    expect(edges).toHaveLength(1)
    expect(edge(edges, 1, 4)?.overlap.exact).toEqual([TRUST])
  })

  it('applies the domain filter to skills but not to values', () => {
    const skillsOff = filters({ sections: ['interpersonal'], threshold: 0.1 })
    expect(similarityEdges(index, skillsOff)).toEqual([])
    expect(similarityEdges(index, { ...skillsOff, basis: 'values' })).toHaveLength(1)
  })

  it('can focus on specific terms', () => {
    const edges = similarityEdges(index, filters({ focus: [VUE], threshold: 0.1 }))
    expect(edges).toHaveLength(1)
    expect(edge(edges, 2, 3)).toBeDefined()
  })

  it('returns no undirected edges for the complementary basis', () => {
    expect(similarityEdges(index, filters({ basis: 'complementary' }))).toEqual([])
  })
})

describe('helpLinks (experience -> desired)', () => {
  it('links someone with exact experience to someone who wants it', () => {
    // Bo has Rust experience; Alex wants Rust.
    const link = helpLinks(index, filters()).find((l) => l.from === 2 && l.to === 1)!
    expect(link.items).toEqual([{ experience: RUST, desired: RUST, score: 1, approximate: false }])
  })

  it('marks related-but-not-identical matches as approximate', () => {
    // Bo (Vue) could help Bo? no: Alex has React, Di wants Vue.
    const l = helpLinks(index, filters({ adjacency: 0.7 })).find((x) => x.from === 1 && x.to === 4)!
    expect(l.items[0]).toMatchObject({ experience: REACT, desired: VUE, approximate: true })
    expect(l.items[0].score).toBeCloseTo(0.7)
  })

  it('drops approximate links at exact-only adjacency', () => {
    expect(helpLinks(index, filters({ adjacency: 0 })).find((x) => x.from === 1 && x.to === 4)).toBeUndefined()
  })

  it('never links a person to themselves', () => {
    expect(helpLinks(index, filters()).every((l) => l.from !== l.to)).toBe(true)
  })

  it('respects the domain filter', () => {
    expect(helpLinks(index, filters({ sections: ['interpersonal'] }))).toEqual([])
  })
})

describe('categoryProfile', () => {
  // Two people who share no exact term, nor any related one, but both work in Languages.
  const langData: GraphData = {
    people: [person(1, 'Ann'), person(2, 'Ben'), person(3, 'Cat')],
    terms: [
      t(10, 'Go', 'skill', 'technical', 'Languages'),
      t(11, 'Zig', 'skill', 'technical', 'Languages'),
      t(12, 'Terraform', 'skill', 'technical', 'Cloud and DevOps'),
      t(13, 'Mentoring', 'skill', 'interpersonal', 'Leadership'),
    ],
    links: [link(1, 10, 'experience'), link(2, 11, 'experience'), link(2, 12, 'experience'), link(3, 13, 'experience')],
    related: [],
  }
  const idx = buildIndex(langData)

  it('gives both people weight in Languages despite sharing no term', () => {
    const p = categoryProfile(idx, filters())
    expect(p.counts.get(1)!.get('technical:Languages')).toBe(1)
    expect(p.counts.get(2)!.get('technical:Languages')).toBe(1)
    expect(similarityEdges(idx, filters({ adjacency: 1, threshold: 0.01 }))).toEqual([])
  })

  it('shows them as close, and an unrelated person as not close', () => {
    const p = categoryProfile(idx, filters())
    expect(p.similarity(1, 2)).toBeGreaterThan(0.5)
    expect(p.similarity(1, 3)).toBe(0)
    expect(p.similarity(1, 2)).toBeCloseTo(p.similarity(2, 1))
    expect(p.similarity(1, 1)).toBeCloseTo(1)
  })

  it('lists each category once, values first, then sections alphabetically', () => {
    const p = categoryProfile(buildIndex(data), filters({ basis: 'values' }))
    expect(p.rows.map((r) => r.key)).toEqual(['values:Relationships and community'])
    const all = categoryProfile(idx, filters())
    expect(all.rows.map((r) => r.key)).toEqual(['interpersonal:Leadership', 'technical:Cloud and DevOps', 'technical:Languages'])
  })

  it('follows the basis and the domain filter', () => {
    const none = categoryProfile(idx, filters({ sections: ['interpersonal'] }))
    expect(none.rows.map((r) => r.category)).toEqual(['Leadership'])
    expect(none.counts.get(1)!.size).toBe(0)
    expect(none.similarity(1, 2)).toBe(0)
  })
})
