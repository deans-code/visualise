export type Selection =
  | { kind: 'person'; id: number }
  | { kind: 'edge'; a: number; b: number }
  | { kind: 'help'; from: number; to: number }
  | null

export const sameSelection = (x: Selection, y: Selection): boolean => {
  if (!x || !y || x.kind !== y.kind) return false
  if (x.kind === 'person') return x.id === (y as typeof x).id
  if (x.kind === 'edge') return x.a === (y as typeof x).a && x.b === (y as typeof x).b
  return x.from === (y as typeof x).from && x.to === (y as typeof x).to
}
