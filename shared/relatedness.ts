/** The facts about a term that relatedness is based on. */
export interface TermInfo {
  id: number
  name: string
  kind: 'value' | 'skill'
  section: string | null
  category: string | null
}

export interface Relatedness {
  /** 0 (unrelated) to 1 (the same term). */
  score: number
  /** Human-readable reasons that contributed to the score, strongest first. */
  reasons: string[]
}

/** Score from the catalogue hierarchy alone: same category, then same section, else unrelated. */
export function hierarchyScore(a: TermInfo, b: TermInfo): Relatedness {
  if (a.id === b.id) return { score: 1, reasons: ['same term'] }
  if (a.kind !== b.kind) return { score: 0, reasons: [] }

  if (a.category && a.category === b.category) {
    return { score: 1, reasons: [`same category: ${a.category}`] }
  }
  if (a.kind === 'skill' && a.section && a.section === b.section) {
    return { score: 0.5, reasons: [`same section: ${a.section}`] }
  }
  if (a.kind === 'value') {
    // All values sit under one root, so values from different categories are only loosely related.
    return { score: 0.25, reasons: ['both are values'] }
  }
  return { score: 0, reasons: [] }
}

/** Weights of the two signals when both are available. */
const HIERARCHY_WEIGHT = 0.6
const DEFINITION_WEIGHT = 0.4

/**
 * Sentence-embedding cosine is rarely near 0 even for unrelated text, so rescale it:
 * measured with all-MiniLM-L6-v2, unrelated definitions sit around 0.0 to 0.25 and
 * clearly related ones (React/Vue, Kubernetes/Docker) around 0.6 to 0.75.
 */
export function definitionSimilarity(cosine: number): number {
  return Math.min(1, Math.max(0, (cosine - 0.2) / 0.5))
}

/**
 * Relatedness of two terms. Uses the catalogue hierarchy, blended with definition similarity
 * when `cosine` (embedding cosine of the two definitions) is supplied. Without it, this is the
 * hierarchy score alone.
 */
export function relatedness(a: TermInfo, b: TermInfo, cosine?: number): Relatedness {
  const h = hierarchyScore(a, b)
  if (cosine === undefined || a.id === b.id) return h
  const d = definitionSimilarity(cosine)
  const reasons = [...h.reasons]
  if (d >= 0.4) reasons.push('similar definitions')
  return { score: HIERARCHY_WEIGHT * h.score + DEFINITION_WEIGHT * d, reasons }
}
