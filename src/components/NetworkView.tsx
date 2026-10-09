import { useMemo } from 'react'
import { helpLinks, similarityEdges, type Filters, type GraphIndex } from '../../shared/graph'
import { detectGroups, type Group } from '../graph/communities'
import { computeLayout } from '../graph/layout'
import { sameSelection, type Selection } from '../graph/selection'
import { groupClass, ShapeMark } from '../graph/Shape'

const W = 800
const H = 520
const pct = (n: number) => `${Math.round(n * 100)}%`

export function NetworkView({
  index,
  filters,
  selection,
  onSelect,
}: {
  index: GraphIndex
  filters: Filters
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  const complementary = filters.basis === 'complementary'
  const people = index.data.people

  const model = useMemo(() => {
    const sim = complementary ? [] : similarityEdges(index, filters)
    const help = complementary ? helpLinks(index, filters) : []
    // Layout and grouping treat help links as undirected ties, weighted relative to the strongest.
    const maxHelp = Math.max(1, ...help.map((h) => h.weight))
    const ties = complementary
      ? Object.values(
          help.reduce<Record<string, { a: number; b: number; weight: number }>>((acc, h) => {
            const [a, b] = h.from < h.to ? [h.from, h.to] : [h.to, h.from]
            const key = `${a}:${b}`
            acc[key] = { a, b, weight: (acc[key]?.weight ?? 0) + h.weight / maxHelp }
            return acc
          }, {}),
        ).map((t) => ({ ...t, weight: Math.min(1, t.weight) }))
      : sim.map((e) => ({ a: e.a, b: e.b, weight: e.similarity }))

    const ids = people.map((p) => p.id)
    return {
      sim,
      help,
      maxHelp,
      layout: computeLayout(ids, ties, W, H),
      grouping: detectGroups(ids, ties),
      connected: new Set(ties.flatMap((t) => [t.a, t.b])),
    }
  }, [index, filters, complementary, people])

  const { sim, help, maxHelp, layout, grouping, connected } = model
  const name = (id: number) => index.person.get(id)?.name ?? String(id)
  const pos = (id: number) => layout.get(id)!
  const connectionCount = complementary ? help.length : sim.length
  // Draw strengths relative to the strongest visible connection, so the spread is legible whatever the data.
  const maxSim = Math.max(0.01, ...sim.map((e) => e.similarity))

  return (
    <div>
      <div className="viz-canvas">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label={`Network of ${people.length} people with ${connectionCount} connections`}
          data-testid="network"
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="help-arrow" />
            </marker>
          </defs>

          {sim.map((e) => {
            const a = pos(e.a)
            const b = pos(e.b)
            const selected = sameSelection(selection, { kind: 'edge', a: e.a, b: e.b })
            const label = `${name(e.a)} and ${name(e.b)}: ${pct(e.similarity)} similar`
            return (
              <g
                key={`${e.a}-${e.b}`}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={selected}
                onClick={() => onSelect({ kind: 'edge', a: e.a, b: e.b })}
                onKeyDown={(ev) => ev.key === 'Enter' && onSelect({ kind: 'edge', a: e.a, b: e.b })}
              >
                <line
                  className="edge"
                  data-edge={`${e.a}-${e.b}`}
                  data-weight={e.similarity.toFixed(3)}
                  data-selected={selected}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  strokeWidth={1 + (e.similarity / maxSim) * 6}
                  strokeOpacity={0.3 + (e.similarity / maxSim) * 0.6}
                />
                <line className="edge-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              </g>
            )
          })}

          {help.map((h) => {
            const a = pos(h.from)
            const b = pos(h.to)
            // Stop short of the target so the arrowhead is not hidden under its marker.
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
            const ex = b.x - ((b.x - a.x) / len) * 16
            const ey = b.y - ((b.y - a.y) / len) * 16
            const selected = sameSelection(selection, { kind: 'help', from: h.from, to: h.to })
            return (
              <g
                key={`${h.from}>${h.to}`}
                role="button"
                tabIndex={0}
                aria-label={`${name(h.from)} could help ${name(h.to)} with ${h.items.length} ${h.items.length === 1 ? 'skill' : 'skills'}`}
                aria-pressed={selected}
                onClick={() => onSelect({ kind: 'help', from: h.from, to: h.to })}
                onKeyDown={(ev) => ev.key === 'Enter' && onSelect({ kind: 'help', from: h.from, to: h.to })}
              >
                <line
                  className="help-edge"
                  data-help={`${h.from}>${h.to}`}
                  data-selected={selected}
                  x1={a.x}
                  y1={a.y}
                  x2={ex}
                  y2={ey}
                  strokeWidth={1 + (h.weight / maxHelp) * 2.5}
                  markerEnd="url(#arrow)"
                />
                <line className="edge-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              </g>
            )
          })}

          {people.map((p) => {
            const { x, y } = pos(p.id)
            const group = grouping.of.get(p.id)
            const selected = sameSelection(selection, { kind: 'person', id: p.id })
            return (
              <g
                key={p.id}
                className="node"
                data-person={p.id}
                data-group={group?.index ?? ''}
                data-connected={connected.has(p.id)}
                data-selected={selected}
                transform={`translate(${x},${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}${group ? `, ${group.label}` : ', not connected'}`}
                aria-pressed={selected}
                onClick={() => onSelect({ kind: 'person', id: p.id })}
                onKeyDown={(ev) => ev.key === 'Enter' && onSelect({ kind: 'person', id: p.id })}
              >
                <ShapeMark shape={group?.shape ?? 'circle'} r={11} className={`node-shape ${groupClass(group?.slot)}`} />
                <text className="node-label" x={0} y={-17} textAnchor="middle">
                  {p.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <Legend groups={grouping.groups} ungrouped={people.filter((p) => !grouping.of.has(p.id)).length} index={index} />
      <TableView index={index} sim={sim} help={help} complementary={complementary} grouping={grouping.groups} />
    </div>
  )
}

function Legend({ groups, ungrouped, index }: { groups: Group[]; ungrouped: number; index: GraphIndex }) {
  return (
    <ul className="legend" aria-label="Groups">
      {groups.map((g) => (
        <li key={g.index} data-group={g.index}>
          <svg width="20" height="20" viewBox="-12 -12 24 24" aria-hidden="true">
            <ShapeMark shape={g.shape} r={9} className={`node-shape ${groupClass(g.slot)}`} />
          </svg>
          {g.label} ({g.members.map((m) => index.person.get(m)?.name).join(', ')})
        </li>
      ))}
      {ungrouped > 0 && (
        <li>
          <svg width="20" height="20" viewBox="-12 -12 24 24" aria-hidden="true">
            <circle r={9} className="node-shape group-other" />
          </svg>
          Not connected under these filters ({ungrouped})
        </li>
      )}
    </ul>
  )
}

/** Everything the picture shows, as a table: the accessible equivalent of the network. */
function TableView({
  index,
  sim,
  help,
  complementary,
  grouping,
}: {
  index: GraphIndex
  sim: ReturnType<typeof similarityEdges>
  help: ReturnType<typeof helpLinks>
  complementary: boolean
  grouping: Group[]
}) {
  const name = (id: number) => index.person.get(id)?.name ?? String(id)
  const term = (id: number) => index.term.get(id)?.name ?? String(id)
  return (
    <details>
      <summary>Show connections as a table</summary>
      <table>
        <thead>
          {complementary ? (
            <tr>
              <th>Could help</th>
              <th>Person</th>
              <th>With</th>
            </tr>
          ) : (
            <tr>
              <th>Person</th>
              <th>Person</th>
              <th>Similarity</th>
              <th>Group</th>
            </tr>
          )}
        </thead>
        <tbody>
          {complementary
            ? help.map((h) => (
                <tr key={`${h.from}>${h.to}`}>
                  <td>{name(h.from)}</td>
                  <td>{name(h.to)}</td>
                  <td>{h.items.map((i) => (i.approximate ? `${term(i.experience)} ≈ ${term(i.desired)}` : term(i.desired))).join(', ')}</td>
                </tr>
              ))
            : sim.map((e) => (
                <tr key={`${e.a}-${e.b}`}>
                  <td>{name(e.a)}</td>
                  <td>{name(e.b)}</td>
                  <td>{pct(e.similarity)}</td>
                  <td>{grouping.find((g) => g.members.includes(e.a) && g.members.includes(e.b))?.label ?? ''}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </details>
  )
}
