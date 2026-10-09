import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'

export interface LayoutNode {
  id: number
  x: number
  y: number
}

export interface LayoutEdge {
  a: number
  b: number
  /** 0 to 1; stronger edges pull their ends closer. */
  weight: number
}

/** Stops a two-person graph being stretched across the whole canvas. */
const MAX_SCALE = 3

interface SimNode {
  id: number
  x?: number
  y?: number
}

/**
 * Static force-directed layout, run to rest synchronously so the same data always gives the same picture
 * (d3-force seeds its initial positions deterministically). Positions are centred on (width/2, height/2).
 */
export function computeLayout(ids: number[], edges: LayoutEdge[], width: number, height: number): Map<number, LayoutNode> {
  const nodes: SimNode[] = ids.map((id) => ({ id }))
  const links = edges.map((e) => ({ source: e.a, target: e.b, weight: e.weight }))

  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, (typeof links)[number]>(links)
        .id((n) => n.id)
        .distance((l) => 40 + (1 - l.weight) * 160)
        .strength((l) => 0.2 + l.weight * 0.6),
    )
    .force('charge', forceManyBody().strength(-220))
    .force('collide', forceCollide(34))
    // Gentle pull toward the middle keeps unconnected people on the canvas without clumping them.
    .force('x', forceX(width / 2).strength(0.06))
    .force('y', forceY(height / 2).strength(0.06))
    .stop()

  for (let i = 0; i < 300; i++) sim.tick()

  // Scale the settled layout up (never down) to fill the canvas, keeping its proportions.
  const pad = 50
  const xs = nodes.map((n) => n.x ?? 0)
  const ys = nodes.map((n) => n.y ?? 0)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const bw = Math.max(maxX - minX, 1)
  const bh = Math.max(maxY - minY, 1)
  const scale = Math.min(MAX_SCALE, (width - 2 * pad) / bw, (height - 2 * pad) / bh)
  const out = new Map<number, LayoutNode>()
  for (const n of nodes) {
    out.set(n.id, {
      id: n.id,
      x: width / 2 + ((n.x ?? 0) - (minX + maxX) / 2) * scale,
      y: height / 2 + ((n.y ?? 0) - (minY + maxY) / 2) * scale,
    })
  }
  return out
}
