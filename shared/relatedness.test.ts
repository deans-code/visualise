import { describe, expect, it } from 'vitest'
import { definitionSimilarity, relatedness, type TermInfo } from './relatedness'

const skill = (id: number, name: string, section: string, category: string): TermInfo => ({
  id,
  name,
  kind: 'skill',
  section,
  category,
})
const value = (id: number, name: string, category: string): TermInfo => ({ id, name, kind: 'value', section: null, category })

const react = skill(1, 'React', 'technical', 'Web and frontend')
const vue = skill(2, 'Vue', 'technical', 'Web and frontend')
const kube = skill(3, 'Kubernetes', 'technical', 'Cloud and DevOps')
const mentoring = skill(4, 'Mentoring', 'interpersonal', 'Leadership')
const trust = value(5, 'Trust', 'Relationships and community')
const empathy = value(6, 'Empathy', 'Relationships and community')
const ambition = value(7, 'Ambition', 'Drive and achievement')

describe('relatedness (hierarchy)', () => {
  it('React/Vue outscores React/Kubernetes', () => {
    expect(relatedness(react, vue).score).toBeGreaterThan(relatedness(react, kube).score)
  })

  it('names the shared category as the reason', () => {
    expect(relatedness(react, vue).reasons).toEqual(['same category: Web and frontend'])
  })

  it('falls back to same section, then to unrelated', () => {
    expect(relatedness(react, kube)).toEqual({ score: 0.5, reasons: ['same section: technical'] })
    expect(relatedness(react, mentoring)).toEqual({ score: 0, reasons: [] })
  })

  it('treats the same term as identical', () => {
    expect(relatedness(react, react).score).toBe(1)
  })

  it('is symmetric', () => {
    for (const [a, b] of [[react, kube], [trust, ambition], [react, trust]] as const) {
      expect(relatedness(a, b).score).toBe(relatedness(b, a).score)
    }
  })

  it('relates values by category, then loosely', () => {
    expect(relatedness(trust, empathy).score).toBe(1)
    expect(relatedness(trust, ambition).score).toBe(0.25)
  })

  it('does not relate a value to a skill by hierarchy', () => {
    expect(relatedness(trust, react).score).toBe(0)
  })
})

describe('relatedness (blended with definition similarity)', () => {
  it('scores close definitions higher within the same hierarchy tier', () => {
    expect(relatedness(react, kube, 0.62).score).toBeGreaterThan(relatedness(react, kube, 0.15).score)
  })

  it('lets similar definitions relate terms the hierarchy does not', () => {
    const mentorship = value(8, 'Mentorship', 'Collaboration and leadership')
    const r = relatedness(mentorship, mentoring, 0.7)
    expect(r.score).toBeGreaterThan(0.3)
    expect(r.reasons).toEqual(['similar definitions'])
  })

  it('keeps same-category pairs with close definitions at the top of the scale', () => {
    const r = relatedness(react, vue, 0.72)
    expect(r.score).toBeCloseTo(1)
    expect(r.reasons).toEqual(['same category: Web and frontend', 'similar definitions'])
  })

  it('does not lift unrelated terms on noise-level similarity', () => {
    expect(relatedness(react, mentoring, 0.1).score).toBe(0)
  })

  it('rescales cosine into 0..1', () => {
    expect(definitionSimilarity(0.1)).toBe(0)
    expect(definitionSimilarity(0.45)).toBeCloseTo(0.5)
    expect(definitionSimilarity(0.9)).toBe(1)
  })

  it('is hierarchy-only when no cosine is given (fallback)', () => {
    expect(relatedness(react, vue).score).toBe(1)
    expect(relatedness(react, kube).score).toBe(0.5)
  })
})
