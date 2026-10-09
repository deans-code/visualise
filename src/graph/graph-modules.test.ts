import { describe, expect, it } from 'vitest'
import { detectGroups } from './communities'
import { computeLayout } from './layout'

// Two tight triangles joined by one weak edge, plus a loner.
const people = [1, 2, 3, 4, 5, 6, 7]
const edges = [
  { a: 1, b: 2, weight: 0.9 },
  { a: 2, b: 3, weight: 0.9 },
  { a: 1, b: 3, weight: 0.9 },
  { a: 4, b: 5, weight: 0.8 },
  { a: 5, b: 6, weight: 0.8 },
  { a: 4, b: 6, weight: 0.8 },
  { a: 3, b: 4, weight: 0.1 },
]

describe('detectGroups', () => {
  it('finds the two clusters and leaves the unconnected person ungrouped', () => {
    const { groups, of } = detectGroups(people, edges)
    expect(groups.map((g) => g.members)).toEqual([[1, 2, 3], [4, 5, 6]])
    expect(of.has(7)).toBe(false)
  })

  it('gives each group a distinct shape and the first groups distinct colours', () => {
    const { groups } = detectGroups(people, edges)
    expect(new Set(groups.map((g) => g.shape)).size).toBe(groups.length)
    expect(groups.map((g) => g.slot)).toEqual([1, 2])
  })

  it('is stable between runs', () => {
    expect(detectGroups(people, edges).groups).toEqual(detectGroups(people, edges).groups)
  })

  it('uses the neutral colour from the fourth group, keeping a distinct shape and label', () => {
    const many = Array.from({ length: 5 }, (_, g) => [g * 2 + 1, g * 2 + 2])
    const { groups } = detectGroups(
      many.flat(),
      many.map(([a, b]) => ({ a, b, weight: 1 })),
    )
    expect(groups).toHaveLength(5)
    expect(groups.map((g) => g.slot)).toEqual([1, 2, 3, 0, 0])
    expect(new Set(groups.map((g) => g.shape)).size).toBe(5)
    expect(new Set(groups.map((g) => g.label)).size).toBe(5)
  })

  it('returns nothing when there are no edges', () => {
    expect(detectGroups(people, []).groups).toEqual([])
  })
})

describe('computeLayout', () => {
  it('is deterministic and keeps every node on the canvas', () => {
    const a = computeLayout(people, edges, 800, 500)
    const b = computeLayout(people, edges, 800, 500)
    expect([...a.values()]).toEqual([...b.values()])
    for (const n of a.values()) {
      expect(n.x).toBeGreaterThanOrEqual(40)
      expect(n.x).toBeLessThanOrEqual(760)
      expect(n.y).toBeGreaterThanOrEqual(40)
      expect(n.y).toBeLessThanOrEqual(460)
    }
  })

  it('places strongly linked people closer than weakly linked ones', () => {
    const l = computeLayout(people, edges, 800, 500)
    const d = (p: number, q: number) => Math.hypot(l.get(p)!.x - l.get(q)!.x, l.get(p)!.y - l.get(q)!.y)
    expect(d(1, 2)).toBeLessThan(d(1, 5))
  })
})
