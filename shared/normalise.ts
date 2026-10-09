/**
 * Canonical comparison key for a term: case-folded, whitespace collapsed, hyphens/underscores
 * treated as spaces, and wrapping punctuation removed. Dots and symbols inside or at the start/end
 * of a term are kept because they carry meaning (".NET", "C#", "C++", "Node.js").
 */
export function normaliseTerm(term: string): string {
  return term
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[-_‐-―]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:!?"'()[\]]+|[\s,;:!?"'()[\]]+$/g, '')
}
