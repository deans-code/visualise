import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'

/** Visual identity of a group: colour slot, shape, and a human label. */
export interface Group {
  /** 1-based, largest group first. */
  index: number
  label: string
  /** Colour slot 1 to 3, or 0 for the neutral "other" colour. Hue is never the only cue; see `shape`. */
  slot: 0 | 1 | 2 | 3
  shape: Shape
  members: number[]
}

export const SHAPES = ['circle', 'square', 'diamond', 'triangle', 'hexagon', 'cross'] as const
export type Shape = (typeof SHAPES)[number]

/** Only three hues pass the colour-blind checks for arbitrary neighbours, so later groups share a neutral. */
const MAX_COLOURED = 3

export interface Grouping {
  groups: Group[]
  /** person id -> group, absent for people with no connections. */
  of: Map<number, Group>
}

/**
 * Detect groups of closely connected people (Louvain on the weighted similarity graph).
 * People with no edges, and communities of one, are left ungrouped.
 */
export function detectGroups(people: number[], edges: { a: number; b: number; weight: number }[]): Grouping {
  const none: Grouping = { groups: [], of: new Map() }
  if (edges.length === 0) return none

  const graph = new Graph({ type: 'undirected' })
  for (const id of people) graph.addNode(String(id))
  for (const e of edges) {
    const key = graph.edge(String(e.a), String(e.b))
    if (key) graph.updateEdgeAttribute(key, 'weight', (w: number) => w + e.weight)
    else graph.addEdge(String(e.a), String(e.b), { weight: e.weight })
  }

  const assignment = louvain(graph, { getEdgeWeight: 'weight', randomWalk: false, resolution: 1 })
  const byCommunity = new Map<number, number[]>()
  for (const id of people) {
    const c = assignment[String(id)]
    byCommunity.set(c, [...(byCommunity.get(c) ?? []), id])
  }

  const communities = [...byCommunity.values()]
    .filter((members) => members.length > 1)
    // Largest first; ties broken by the smallest member id so results are stable between runs.
    .sort((x, y) => y.length - x.length || Math.min(...x) - Math.min(...y))

  const groups: Group[] = communities.map((members, i) => ({
    index: i + 1,
    label: `Group ${i + 1}`,
    slot: i < MAX_COLOURED ? ((i + 1) as 1 | 2 | 3) : 0,
    shape: SHAPES[i % SHAPES.length],
    members: members.sort((p, q) => p - q),
  }))
  const of = new Map<number, Group>()
  for (const g of groups) for (const m of g.members) of.set(m, g)
  return { groups, of }
}
