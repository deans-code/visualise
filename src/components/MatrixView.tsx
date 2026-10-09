import { useMemo } from 'react'
import { effectiveScore, termsOf, type Filters, type GraphIndex, type Role } from '../../shared/graph'
import { SECTION_LABELS, type Section } from '../../shared/profile'
import { accentOf, matrixCellExplanation, matrixLegendExplanation, termExplanation } from '../explanations'
import { useExplain } from '../explain'

const pct = (n: number) => `${Math.round(n * 100)}%`

/** Which role the matrix reads. "Could help" shows what people have, marking what they want. */
const roleOf = (f: Filters): Role => (f.basis === 'values' ? 'value' : f.basis === 'desired' ? 'desired' : 'experience')

interface Cell {
  /** The person has the term (in the role being shown). */
  has: boolean
  /** Strength of the closest related term they do have, 0 when they have none or adjacency is off. */
  related: number
  relatedVia: number | null
  /** For the "could help" basis: the person wants this term. */
  wants: boolean
}

/** Related terms weaker than this are not worth a mark; they would shade nearly every cell. */
const MIN_RELATED_SHOWN = 0.25

const level = (c: Cell) => (c.has ? 5 : c.related > 0 ? Math.min(4, Math.max(1, Math.ceil(c.related * 4))) : 0)

export function MatrixView({ index, filters }: { index: GraphIndex; filters: Filters }) {
  const role = roleOf(filters)
  const people = index.data.people
  const explain = useExplain()

  const model = useMemo(() => {
    const owned = new Map(people.map((p) => [p.id, new Set(termsOf(index, p.id, role, filters))]))
    const wanted = new Map(people.map((p) => [p.id, new Set(termsOf(index, p.id, 'desired', filters))]))

    const rowIds = new Set<number>()
    for (const set of owned.values()) for (const t of set) rowIds.add(t)
    if (filters.basis === 'complementary') for (const set of wanted.values()) for (const t of set) rowIds.add(t)

    const rows = [...rowIds]
      .map((id) => index.term.get(id)!)
      .sort(
        (a, b) =>
          (a.kind === b.kind ? 0 : a.kind === 'value' ? -1 : 1) ||
          (a.section ?? '').localeCompare(b.section ?? '') ||
          (a.category ?? '').localeCompare(b.category ?? '') ||
          a.name.localeCompare(b.name),
      )

    const cell = (personId: number, termId: number): Cell => {
      const mine = owned.get(personId)!
      const has = mine.has(termId)
      let related = 0
      let relatedVia: number | null = null
      if (!has) {
        for (const other of mine) {
          const s = effectiveScore(index, other, termId, filters.adjacency)
          if (s >= MIN_RELATED_SHOWN && s > related) {
            related = s
            relatedVia = other
          }
        }
      }
      return { has, related, relatedVia, wants: filters.basis === 'complementary' && wanted.get(personId)!.has(termId) }
    }

    return { rows, cell }
  }, [index, filters, people, role])

  if (model.rows.length === 0) return <p>No terms match the current filters.</p>

  const groupKey = (t: (typeof model.rows)[number]) =>
    t.kind === 'value' ? 'Values' : `${SECTION_LABELS[t.section as Section] ?? t.section ?? 'Other'} · ${t.category ?? 'Uncategorised'}`

  let lastGroup = ''
  return (
    <div className="viz-canvas">
      <table className="matrix" aria-label="People by term">
        <thead>
          <tr>
            <th scope="col">Term</th>
            {people.map((p) => (
              <th key={p.id} scope="col" className="col-head">
                {p.name}
              </th>
            ))}
            <th scope="col">People</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.flatMap((t) => {
            const group = groupKey(t)
            const out = []
            if (group !== lastGroup) {
              lastGroup = group
              out.push(
                <tr key={`g-${group}`} className="domain-row">
                  <th scope="rowgroup" colSpan={people.length + 2}>
                    {group}
                  </th>
                </tr>,
              )
            }
            const cells = people.map((p) => ({ p, c: model.cell(p.id, t.id) }))
            out.push(
              <tr key={t.id} data-term={t.id}>
                <th scope="row" data-section={accentOf(t)} tabIndex={0} {...explain.props(termExplanation(t))}>
                  {t.name}
                </th>
                {cells.map(({ p, c }) => {
                  const via = c.relatedVia !== null ? index.term.get(c.relatedVia)?.name : null
                  const label = c.has
                    ? `${p.name} has ${t.name}`
                    : c.related > 0
                      ? `${p.name} has related ${via} (${pct(c.related)})`
                      : `${p.name} does not have ${t.name}`
                  return (
                    <td
                      key={p.id}
                      data-person={p.id}
                      data-level={level(c)}
                      data-has={c.has}
                      aria-label={c.wants ? `${label}; wants to learn it` : label}
                      title={label}
                      tabIndex={0}
                      {...explain.props(matrixCellExplanation(p.name, t.name, { has: c.has, related: c.related, via: via ?? null, wants: c.wants }))}
                    >
                      {c.has ? '●' : c.related > 0 ? '≈' : ''}
                      {c.wants ? <sup>W</sup> : null}
                    </td>
                  )
                })}
                <td>{cells.filter(({ c }) => c.has).length}</td>
              </tr>,
            )
            return out
          })}
        </tbody>
      </table>
      <p className="legend" style={{ padding: '0 0.5rem' }} tabIndex={0} {...explain.props(matrixLegendExplanation(filters.basis === 'complementary'))}>
        ● has it · ≈ has a related term (darker is closer){filters.basis === 'complementary' ? ' · W wants to learn it' : ''}
      </p>
    </div>
  )
}
