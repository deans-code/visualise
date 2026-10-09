import { useMemo } from 'react'
import { categoryProfile, type Filters, type GraphIndex } from '../../shared/graph'
import { SECTION_LABELS, type Section } from '../../shared/profile'
import { categoryCellExplanation, categoryLegendExplanation } from '../explanations'
import { useExplain } from '../explain'

const pct = (n: number) => `${Math.round(n * 100)}%`
const sectionLabel = (s: string | null) => (s === null ? 'Values' : (SECTION_LABELS[s as Section] ?? s))

/**
 * People compared by the catalogue's categories rather than by individual terms: two people who picked
 * different languages both show weight in "Languages", and the table below shows who is close overall.
 */
export function CategoryView({ index, filters }: { index: GraphIndex; filters: Filters }) {
  const people = index.data.people
  const explain = useExplain()
  const profile = useMemo(() => categoryProfile(index, filters), [index, filters])

  const model = useMemo(() => {
    const maxOf = new Map(people.map((p) => [p.id, Math.max(0, ...(profile.counts.get(p.id)?.values() ?? []))]))
    const sections: { section: string | null; rows: typeof profile.rows }[] = []
    for (const r of profile.rows) {
      const last = sections.at(-1)
      if (last && last.section === r.section) last.rows.push(r)
      else sections.push({ section: r.section, rows: [r] })
    }
    const pairs = people.flatMap((a, i) =>
      people.slice(i + 1).map((b) => ({ a, b, similarity: profile.similarity(a.id, b.id) })),
    )
    return { maxOf, sections, pairs: pairs.sort((x, y) => y.similarity - x.similarity) }
  }, [people, profile])

  if (profile.rows.length === 0) return <p>No terms match the current filters.</p>

  const level = (personId: number, count: number) => {
    const max = model.maxOf.get(personId) ?? 0
    return count > 0 && max > 0 ? Math.max(1, Math.ceil((5 * count) / max)) : 0
  }

  return (
    <div className="viz-canvas">
      <table className="matrix" aria-label="People by category">
        <thead>
          <tr>
            <th scope="col">Category</th>
            {people.map((p) => (
              <th key={p.id} scope="col" className="col-head">
                {p.name}
              </th>
            ))}
            <th scope="col">People</th>
          </tr>
        </thead>
        <tbody>
          {model.sections.flatMap((group) => {
            const subtotal = (personId: number) =>
              group.rows.reduce((sum, r) => sum + (profile.counts.get(personId)?.get(r.key) ?? 0), 0)
            return [
              <tr key={`s-${group.section}`} className="domain-row">
                <th scope="rowgroup" data-section={group.section ?? 'values'}>
                  {sectionLabel(group.section)}
                </th>
                {people.map((p) => (
                  <td key={p.id} data-person={p.id} data-subtotal aria-label={`${p.name}: ${subtotal(p.id)} in ${sectionLabel(group.section)}`}>
                    {subtotal(p.id) || ''}
                  </td>
                ))}
                <td />
              </tr>,
              ...group.rows.map((r) => {
                const having = people.filter((p) => (profile.counts.get(p.id)?.get(r.key) ?? 0) > 0).length
                return (
                  <tr key={r.key} data-category={r.key}>
                    <th scope="row">{r.category}</th>
                    {people.map((p) => {
                      const n = profile.counts.get(p.id)?.get(r.key) ?? 0
                      return (
                        <td
                          key={p.id}
                          data-person={p.id}
                          data-level={level(p.id, n)}
                          aria-label={`${p.name}: ${n} ${n === 1 ? 'term' : 'terms'} in ${r.category}`}
                          title={`${p.name}: ${n} in ${r.category}`}
                          tabIndex={0}
                          {...explain.props(categoryCellExplanation(p.name, r.category, n))}
                        >
                          {n || ''}
                        </td>
                      )
                    })}
                    <td>{having}</td>
                  </tr>
                )
              }),
            ]
          })}
        </tbody>
      </table>
      <p className="legend" style={{ padding: '0 0.5rem' }} tabIndex={0} {...explain.props(categoryLegendExplanation)}>
        Numbers are how many of a person’s terms fall in each category; darker is a bigger share of that person’s own
        profile. “People” counts who has anything there.
      </p>

      <h3 style={{ padding: '0 0.5rem' }}>Closest by category</h3>
      <table className="matrix" aria-label="Closeness by category">
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Person</th>
            <th scope="col">Closeness</th>
          </tr>
        </thead>
        <tbody>
          {model.pairs.map(({ a, b, similarity }) => (
            <tr key={`${a.id}-${b.id}`} data-pair={`${a.id}-${b.id}`} data-closeness={similarity.toFixed(3)}>
              <th scope="row">{a.name}</th>
              <th scope="row">{b.name}</th>
              <td style={{ width: 'auto', padding: '0 0.5rem' }}>{pct(similarity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
