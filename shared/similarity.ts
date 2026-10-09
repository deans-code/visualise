export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** 1 for identical strings down to 0 for entirely different ones. */
export function editSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max
}

export interface SpellingMatch {
  score: number
  reason: string
}

/**
 * Whether two normalised terms look like spelling variants of one another
 * ("postgres" / "postgresql", "typscript" / "typescript"). Returns null when they do not.
 */
export function spellingMatch(a: string, b: string): SpellingMatch | null {
  if (a === b) return { score: 1, reason: 'identical' }
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length >= 4 && long.startsWith(short) && long.length - short.length <= 3) {
    return { score: 0.9, reason: 'abbreviation' }
  }
  const sim = editSimilarity(a, b)
  if (a.length >= 5 && b.length >= 5 && sim >= 0.82) return { score: sim, reason: 'similar spelling' }
  return null
}
