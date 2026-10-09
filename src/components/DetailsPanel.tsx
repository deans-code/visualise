import { helpLinks, similarityEdges, softOverlap, termsOf, type Filters, type GraphIndex, type Role } from '../../shared/graph'
import type { Selection } from '../graph/selection'
import { accentOf, termExplanation } from '../explanations'
import { useExplain } from '../explain'

const pct = (n: number) => `${Math.round(n * 100)}%`

/** A term that expands to show its definition and where it sits in the catalogue. */
function TermDef({ index, id }: { index: GraphIndex; id: number }) {
  const explain = useExplain()
  const t = index.term.get(id)
  if (!t) return null
  return (
    <details className="term-def" data-section={accentOf(t)} {...explain.props(termExplanation(t))}>
      <summary>{t.name}</summary>
      <p>{t.definition ?? 'No definition yet.'}</p>
      {t.category && <small>{t.section ? `${t.section} · ` : ''}{t.category}</small>}
    </details>
  )
}

const ROLE_LABEL: Record<Role, string> = { value: 'Values', experience: 'Experience', desired: 'Wants to learn' }

export function DetailsPanel({
  index,
  filters,
  selection,
}: {
  index: GraphIndex
  filters: Filters
  selection: Selection
}) {
  const name = (id: number) => index.person.get(id)?.name ?? String(id)

  return (
    <aside className="viz-side" aria-label="Details" aria-live="polite">
      {!selection && <p>Select a person or a connection to see what links them. Right-click a term to read its definition.</p>}
      {selection?.kind === 'person' && <PersonDetails index={index} filters={filters} id={selection.id} name={name} />}
      {selection?.kind === 'edge' && <EdgeDetails index={index} filters={filters} a={selection.a} b={selection.b} name={name} />}
      {selection?.kind === 'help' && <HelpDetails index={index} filters={filters} from={selection.from} to={selection.to} name={name} />}
    </aside>
  )
}

function PersonDetails({ index, filters, id, name }: { index: GraphIndex; filters: Filters; id: number; name: (n: number) => string }) {
  const edges = similarityEdges(index, filters)
    .filter((e) => e.a === id || e.b === id)
    .sort((x, y) => y.similarity - x.similarity)
  const roles: Role[] = ['value', 'experience', 'desired']

  return (
    <div>
      <h3>{name(id)}</h3>
      {roles.map((role) => {
        const terms = index.has.get(id)?.[role] ?? []
        if (terms.length === 0) return null
        return (
          <section key={role} aria-label={ROLE_LABEL[role]}>
            <h4>{ROLE_LABEL[role]}</h4>
            {terms.map((t) => (
              <TermDef key={t} index={index} id={t} />
            ))}
          </section>
        )
      })}
      {edges.length > 0 && (
        <section aria-label="Most similar">
          <h4>Most similar under the current filters</h4>
          <ul>
            {edges.slice(0, 5).map((e) => {
              const other = e.a === id ? e.b : e.a
              return (
                <li key={other}>
                  {name(other)} ({pct(e.similarity)})
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function EdgeDetails({
  index,
  filters,
  a,
  b,
  name,
}: {
  index: GraphIndex
  filters: Filters
  a: number
  b: number
  name: (n: number) => string
}) {
  const role: Role | null =
    filters.basis === 'values' ? 'value' : filters.basis === 'experience' ? 'experience' : filters.basis === 'desired' ? 'desired' : null
  if (!role) return null
  const overlap = softOverlap(index, termsOf(index, a, role, filters), termsOf(index, b, role, filters), filters.adjacency)
  if (overlap.similarity === 0) return <p>This connection is hidden by the current filters.</p>

  const term = (id: number) => index.term.get(id)?.name ?? String(id)
  return (
    <div>
      <h3>
        {name(a)} and {name(b)}
      </h3>
      <p>
        {pct(overlap.similarity)} similar · {ROLE_LABEL[role].toLowerCase()}
      </p>

      {overlap.exact.length > 0 && (
        <section aria-label="Shared terms">
          <h4>Shared exactly</h4>
          {overlap.exact.map((t) => (
            <TermDef key={t} index={index} id={t} />
          ))}
        </section>
      )}

      {overlap.related.length > 0 && (
        <section aria-label="Related terms">
          <h4>Related, not identical</h4>
          <ul>
            {overlap.related.map((m) => (
              <li key={`${m.a}-${m.b}`}>
                <strong>
                  {term(m.a)} ↔ {term(m.b)}
                </strong>{' '}
                ({pct(m.score)})
                <br />
                <small>{m.reasons.join(', ') || 'related terms'}</small>
                <TermDef index={index} id={m.a} />
                <TermDef index={index} id={m.b} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function HelpDetails({
  index,
  filters,
  from,
  to,
  name,
}: {
  index: GraphIndex
  filters: Filters
  from: number
  to: number
  name: (n: number) => string
}) {
  const link = helpLinks(index, filters).find((l) => l.from === from && l.to === to)
  if (!link) return <p>This link is hidden by the current filters.</p>
  const term = (id: number) => index.term.get(id)?.name ?? String(id)
  return (
    <div>
      <h3>
        {name(from)} could help {name(to)}
      </h3>
      <ul>
        {link.items.map((i) => (
          <li key={`${i.experience}-${i.desired}`}>
            {i.approximate ? (
              <>
                <strong>
                  {term(i.experience)} → {term(i.desired)}
                </strong>{' '}
                <em>approximate match</em> ({pct(i.score)})
                <br />
                <small>{index.relatedReasons(i.experience, i.desired).join(', ')}</small>
                <TermDef index={index} id={i.experience} />
                <TermDef index={index} id={i.desired} />
              </>
            ) : (
              <TermDef index={index} id={i.desired} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
