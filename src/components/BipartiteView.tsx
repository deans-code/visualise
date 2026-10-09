import { useMemo, useState, type KeyboardEvent } from 'react'
import { termsOf, type Filters, type GraphIndex, type Role } from '../../shared/graph'
import { SECTION_LABELS, type Section } from '../../shared/profile'
import { bipartitePersonExplanation, bipartiteTermExplanation } from '../explanations'
import { useExplain } from '../explain'

const ROW = 24
const W = 820
const LEFT = 150
const RIGHT = 470
const TOP = 36

const roleOf = (f: Filters): Role => (f.basis === 'values' ? 'value' : f.basis === 'desired' ? 'desired' : 'experience')

type Focus = { kind: 'person' | 'term'; id: number } | null

/**
 * People on the left, terms on the right, a line wherever a person has a term. Terms joined by many lines are
 * what the group has in common; a term with one line is a niche strength.
 */
export function BipartiteView({ index, filters }: { index: GraphIndex; filters: Filters }) {
  const explain = useExplain()
  const [focus, setFocus] = useState<Focus>(null)
  const [showSingles, setShowSingles] = useState(false)
  const role = roleOf(filters)
  const people = index.data.people

  const model = useMemo(() => {
    const links: { person: number; term: number }[] = []
    const count = new Map<number, number>()
    for (const p of people) {
      for (const t of termsOf(index, p.id, role, filters)) {
        links.push({ person: p.id, term: t })
        count.set(t, (count.get(t) ?? 0) + 1)
      }
    }
    // By default show only what people share; terms held by one person bury the overlap in noise.
    const sharedExists = [...count.values()].some((n) => n > 1)
    const hideSingles = !showSingles && sharedExists
    const terms = [...count.keys()]
      .filter((id) => !hideSingles || count.get(id)! > 1)
      .map((id) => index.term.get(id)!)
      .sort(
        (a, b) =>
          (a.kind === b.kind ? 0 : a.kind === 'value' ? -1 : 1) ||
          (a.section ?? '').localeCompare(b.section ?? '') ||
          (a.category ?? '').localeCompare(b.category ?? '') ||
          count.get(b.id)! - count.get(a.id)! ||
          a.name.localeCompare(b.name),
      )

    // Terms in rows, with a heading row whenever the category changes.
    const rows: ({ heading: string; y: number } | { term: (typeof terms)[number]; y: number })[] = []
    const y = new Map<number, number>()
    let last = ''
    let cursor = TOP
    for (const t of terms) {
      const heading =
        t.kind === 'value' ? 'Values' : `${SECTION_LABELS[t.section as Section] ?? t.section ?? 'Other'} · ${t.category ?? 'Uncategorised'}`
      if (heading !== last) {
        last = heading
        rows.push({ heading, y: cursor })
        cursor += ROW
      }
      rows.push({ term: t, y: cursor })
      y.set(t.id, cursor)
      cursor += ROW
    }
    const height = Math.max(cursor + ROW, TOP + people.length * 34)
    const span = height - TOP - ROW
    const personY = new Map(people.map((p, i) => [p.id, TOP + (people.length === 1 ? span / 2 : (i * span) / (people.length - 1))]))
    const visible = links.filter((l) => y.has(l.term))
    return { links: visible, count, rows, y, personY, height, hidden: count.size - terms.length, sharedExists }
  }, [index, filters, people, role, showSingles])

  if (model.links.length === 0) return <p>No terms match the current filters.</p>

  const active = (l: { person: number; term: number }) =>
    !focus || (focus.kind === 'person' ? l.person === focus.id : l.term === focus.id)
  const toggle = (f: NonNullable<Focus>) => setFocus(focus?.kind === f.kind && focus.id === f.id ? null : f)
  // The element's own Enter key, with "?" and Shift+F10 left to the explanation.
  const withEnter = (ex: ReturnType<typeof explain.props>, f: NonNullable<Focus>) => ({
    ...ex,
    onKeyDown: (e: KeyboardEvent<Element>) => {
      ex.onKeyDown?.(e)
      if (!e.defaultPrevented && e.key === 'Enter') toggle(f)
    },
  })
  const personEx = (p: { id: number; name: string }) =>
    withEnter(explain.props(bipartitePersonExplanation(p.name, termsOf(index, p.id, role, filters).length)), { kind: 'person', id: p.id })
  const termEx = (t: (typeof index.data.terms)[number]) =>
    withEnter(explain.props(bipartiteTermExplanation(t, model.count.get(t.id) ?? 0)), { kind: 'term', id: t.id })

  return (
    <div className="viz-canvas">
      {model.sharedExists && (
        <p style={{ padding: '0.5rem 0.75rem 0', margin: 0 }}>
          <label>
            <input type="checkbox" checked={showSingles} onChange={(e) => setShowSingles(e.target.checked)} /> Also show terms only
            one person has{!showSingles && model.hidden > 0 ? ` (${model.hidden} hidden)` : ''}
          </label>
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${model.height}`} role="group" aria-label="People linked to the terms they have" data-testid="bipartite">
        {model.links.map((l) => (
          <line
            key={`${l.person}-${l.term}`}
            className="edge"
            data-link={`${l.person}-${l.term}`}
            data-dim={!active(l)}
            x1={LEFT}
            y1={model.personY.get(l.person)}
            x2={RIGHT}
            y2={model.y.get(l.term)! - 4}
            strokeWidth={active(l) ? 1.75 : 1}
            strokeOpacity={active(l) ? 0.8 : 0.15}
          />
        ))}

        {people.map((p) => (
          <g
            key={p.id}
            data-person={p.id}
            role="button"
            tabIndex={0}
            aria-pressed={focus?.kind === 'person' && focus.id === p.id}
            aria-label={`${p.name}: ${termsOf(index, p.id, role, filters).length} terms. Highlight their terms`}
            onClick={() => toggle({ kind: 'person', id: p.id })}
            {...personEx(p)}
            style={{ cursor: 'pointer' }}
          >
            <text className="node-label" x={LEFT - 14} y={model.personY.get(p.id)! + 4} textAnchor="end">
              {p.name}
            </text>
            <circle className="node-shape group-1" cx={LEFT} cy={model.personY.get(p.id)} r={6} />
          </g>
        ))}

        {model.rows.map((r) =>
          'heading' in r ? null : (
            <g
              key={r.term.id}
              data-term={r.term.id}
              role="button"
              tabIndex={0}
              aria-pressed={focus?.kind === 'term' && focus.id === r.term.id}
              aria-label={`${r.term.name}: ${model.count.get(r.term.id)} ${model.count.get(r.term.id) === 1 ? 'person' : 'people'}. Highlight them`}
              onClick={() => toggle({ kind: 'term', id: r.term.id })}
              {...termEx(r.term)}
              style={{ cursor: 'pointer' }}
            >
              <rect className="node-shape group-2" x={RIGHT - 5} y={r.y - 9} width={10} height={10} rx={2} />
              <text className="node-label" x={RIGHT + 14} y={r.y}>
                {r.term.name} ({model.count.get(r.term.id)})
              </text>
            </g>
          ),
        )}

        {/* Category headings sit in the right column, above their terms. */}
        {model.rows.map((r) =>
          'heading' in r ? (
            <text key={`h-${r.heading}`} x={RIGHT - 5} y={r.y} fontSize={11} fill="var(--text-secondary)">
              {r.heading}
            </text>
          ) : null,
        )}
      </svg>
      <p className="legend" style={{ padding: '0 0.5rem' }}>
        Circles are people, squares are terms (with how many people have them). Select one to highlight its lines.
      </p>
    </div>
  )
}
