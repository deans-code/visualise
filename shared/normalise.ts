/** Canonical comparison key for a term: case-folded, trimmed, whitespace collapsed. */
export function normaliseTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ')
}
