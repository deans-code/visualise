import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { helpLinks, similarityEdges, type Filters, type GraphIndex } from '../../shared/graph'
import { detectGroups, type Group } from '../graph/communities'
import { computeLayout } from '../graph/layout'
import { sameSelection, type Selection } from '../graph/selection'
import { groupClass, ShapeMark } from '../graph/Shape'
import {
  edgeExplanation,
  GROUPS_GUIDE,
  groupExplanation,
  helpEdgeExplanation,
  nodeExplanation,
  ungroupedExplanation,
} from '../explanations'
import { useExplain, type ExplainProps } from '../explain'
import { HelpPanel } from './HelpPanel'

const DEFAULT_W = 800
const H = 520
/** A press that moves less than this many screen pixels is a click, not a drag. */
export const DRAG_THRESHOLD = 4
const KEY_STEP = 10
const KEY_STEP_BIG = 40
const MARGIN = 20
const pct = (n: number) => `${Math.round(n * 100)}%`

type Point = { x: number; y: number }
const EMPTY: Map<number, Point> = new Map()

/**
 * The drawing's coordinate width. It follows the canvas's shape so a wide screen gets a wide picture rather
 * than a narrow one with empty gutters; it moves in steps of 100 so a small resize does not re-lay everything.
 */
function useCanvasWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(DEFAULT_W)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const cw = el.clientWidth
      if (!cw) return
      const targetHeight = Math.min(900, Math.max(420, window.innerHeight * 0.7))
      setW(Math.max(600, Math.round(((cw / targetHeight) * H) / 100) * 100))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

/** Explanation handlers plus a component's own keys; "?" and Shift+F10 win, so they never also act. */
const withKeys = (ex: ExplainProps, onKey: (ev: KeyboardEvent<SVGGElement>) => void): ExplainProps => ({
  ...ex,
  onKeyDown: (ev) => {
    ex.onKeyDown?.(ev)
    if (!ev.defaultPrevented) onKey(ev as KeyboardEvent<SVGGElement>)
  },
})

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

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
  const explain = useExplain()
  const canvas = useRef<HTMLDivElement>(null)
  const W = useCanvasWidth(canvas)
  // Manual positions belong to the layout they were made on: new data, filters or width start afresh.
  const [dragged, setDragged] = useState<{ model: unknown; pos: Map<number, Point> } | null>(null)
  const active = useRef<{ id: number; pointer: number; startX: number; startY: number; from: Point; scale: number; moving: boolean } | null>(null)
  const justDragged = useRef(false)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  // A highlighted group belongs to the grouping it was chosen in: a filter change starts afresh.
  const [highlighted, setHighlighted] = useState<{ grouping: unknown; index: number } | null>(null)

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
  }, [index, filters, complementary, people, W])

  const { sim, help, maxHelp, layout, grouping, connected } = model
  const lit = highlighted?.grouping === grouping ? grouping.groups.find((g) => g.index === highlighted.index) : undefined
  const inLit = (id: number) => !!lit && lit.members.includes(id)
  const dimmed = (...ids: number[]) => !!lit && !ids.every(inLit)
  const name = (id: number) => index.person.get(id)?.name ?? String(id)
  const moved = dragged?.model === model ? dragged.pos : EMPTY
  const pos = (id: number): Point => moved.get(id) ?? layout.get(id)!
  const moveTo = (id: number, p: Point) =>
    setDragged((d) => {
      const pos = new Map(d?.model === model ? d.pos : EMPTY)
      pos.set(id, { x: clamp(p.x, MARGIN, W - MARGIN), y: clamp(p.y, MARGIN + 6, H - MARGIN) })
      return { model, pos }
    })

  const onNodeDown = (e: PointerEvent<SVGGElement>, id: number) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    active.current = {
      id,
      pointer: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      from: pos(id),
      // Screen pixels to drawing units; 1 where there is no layout (tests).
      scale: rect && rect.width ? W / rect.width : 1,
      moving: false,
    }
  }
  const onNodeMove = (e: PointerEvent<SVGGElement>) => {
    const a = active.current
    if (!a || a.pointer !== e.pointerId) return
    const dx = e.clientX - a.startX
    const dy = e.clientY - a.startY
    if (!a.moving) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      a.moving = true
      // Moving means this is a drag, so it can no longer become a touch long-press.
      explain.cancelPress()
      setDraggingId(a.id)
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    moveTo(a.id, { x: a.from.x + dx * a.scale, y: a.from.y + dy * a.scale })
  }
  const onNodeUp = (e: PointerEvent<SVGGElement>) => {
    const a = active.current
    if (!a || a.pointer !== e.pointerId) return
    active.current = null
    setDraggingId(null)
    if (a.moving) {
      // The click that follows a drag must not select.
      justDragged.current = true
      window.setTimeout(() => (justDragged.current = false), 0)
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    }
  }
  const onNodeKey = (ev: KeyboardEvent<SVGGElement>, id: number) => {
    if (ev.key === 'Enter') return onSelect({ kind: 'person', id })
    const step = ev.shiftKey ? KEY_STEP_BIG : KEY_STEP
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }
    const d = delta[ev.key]
    if (!d) return
    ev.preventDefault()
    const p = pos(id)
    moveTo(id, { x: p.x + d.x, y: p.y + d.y })
  }
  const connectionCount = complementary ? help.length : sim.length
  // Draw strengths relative to the strongest visible connection, so the spread is legible whatever the data.
  const maxSim = Math.max(0.01, ...sim.map((e) => e.similarity))

  return (
    <div>
      <div className="viz-canvas" ref={canvas}>
        <div className="toolbar">
          <button type="button" className="secondary" onClick={() => setDragged(null)} disabled={moved.size === 0}>
            Reset layout
          </button>
          <p className="hint">Drag a person, or focus one and use the arrow keys, to move them. Reset layout puts everyone back.</p>
        </div>
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
            const ex = withKeys(explain.props(edgeExplanation(name(e.a), name(e.b), e.similarity)), (ev) => {
              if (ev.key === 'Enter') onSelect({ kind: 'edge', a: e.a, b: e.b })
            })
            return (
              <g
                key={`${e.a}-${e.b}`}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={selected}
                data-dimmed={dimmed(e.a, e.b)}
                onClick={() => onSelect({ kind: 'edge', a: e.a, b: e.b })}
                {...ex}
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
            const xp = withKeys(explain.props(helpEdgeExplanation(name(h.from), name(h.to), h.items.length)), (ev) => {
              if (ev.key === 'Enter') onSelect({ kind: 'help', from: h.from, to: h.to })
            })
            return (
              <g
                key={`${h.from}>${h.to}`}
                role="button"
                tabIndex={0}
                aria-label={`${name(h.from)} could help ${name(h.to)} with ${h.items.length} ${h.items.length === 1 ? 'skill' : 'skills'}`}
                aria-pressed={selected}
                data-dimmed={dimmed(h.from, h.to)}
                onClick={() => onSelect({ kind: 'help', from: h.from, to: h.to })}
                {...xp}
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
            const ex = withKeys(
              explain.props(
                nodeExplanation(p.name, group?.label ?? null, sim.filter((e) => e.a === p.id || e.b === p.id).length + help.filter((h) => h.from === p.id || h.to === p.id).length),
              ),
              (ev) => onNodeKey(ev, p.id),
            )
            return (
              <g
                key={p.id}
                className="node"
                data-dragging={draggingId === p.id}
                data-person={p.id}
                data-group={group?.index ?? ''}
                data-connected={connected.has(p.id)}
                data-selected={selected}
                data-dimmed={dimmed(p.id)}
                transform={`translate(${x},${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}${group ? `, ${group.label}` : ', not connected'}`}
                aria-pressed={selected}
                onClick={() => {
                  if (!justDragged.current) onSelect({ kind: 'person', id: p.id })
                }}
                {...ex}
                onPointerDown={(e) => {
                  ex.onPointerDown?.(e)
                  onNodeDown(e, p.id)
                }}
                onPointerMove={onNodeMove}
                onPointerUp={(e) => {
                  ex.onPointerUp?.()
                  onNodeUp(e)
                }}
                onPointerCancel={(e) => {
                  ex.onPointerCancel?.()
                  onNodeUp(e)
                }}
              >
                {/* A larger invisible target, so a node is easy to grab with a finger or a shaky mouse. */}
                <circle r={18} fill="transparent" />
                <ShapeMark shape={group?.shape ?? 'circle'} r={11} className={`node-shape ${groupClass(group?.slot)}`} />
                <text className="node-label" x={0} y={-17} textAnchor="middle">
                  {p.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <HelpPanel id="groups" title={GROUPS_GUIDE.title} gestures={false}>
        {(grouping.groups.length > 0 ? GROUPS_GUIDE.withGroups : GROUPS_GUIDE.noGroups).map((t) => (
          <p key={t}>{t}</p>
        ))}
      </HelpPanel>
      <Legend
        groups={grouping.groups}
        ungrouped={people.filter((p) => !grouping.of.has(p.id)).length}
        index={index}
        highlighted={lit?.index ?? null}
        onHighlight={(i) => setHighlighted(i === null ? null : { grouping, index: i })}
      />
      <TableView index={index} sim={sim} help={help} complementary={complementary} grouping={grouping.groups} />
    </div>
  )
}

function Legend({
  groups,
  ungrouped,
  index,
  highlighted,
  onHighlight,
}: {
  groups: Group[]
  ungrouped: number
  index: GraphIndex
  highlighted: number | null
  onHighlight: (index: number | null) => void
}) {
  const explain = useExplain()
  const names = (g: Group) => g.members.map((m) => index.person.get(m)?.name ?? String(m))
  const lit = groups.find((g) => g.index === highlighted)
  return (
    <>
      <ul className="legend" aria-label="Groups">
        {groups.map((g) => (
          <li key={g.index} data-group={g.index} {...explain.props(groupExplanation(g.label, names(g)))}>
            <button
              type="button"
              className="legend-item"
              aria-pressed={g.index === highlighted}
              onClick={() => onHighlight(g.index === highlighted ? null : g.index)}
            >
              <svg width="20" height="20" viewBox="-12 -12 24 24" aria-hidden="true">
                <ShapeMark shape={g.shape} r={9} className={`node-shape ${groupClass(g.slot)}`} />
              </svg>
              {g.label} ({names(g).join(', ')})
            </button>
          </li>
        ))}
        {ungrouped > 0 && (
          <li tabIndex={0} {...explain.props(ungroupedExplanation(ungrouped))}>
            <svg width="20" height="20" viewBox="-12 -12 24 24" aria-hidden="true">
              <circle r={9} className="node-shape group-other" />
            </svg>
            Not connected under these filters ({ungrouped})
          </li>
        )}
      </ul>
      {lit && (
        <p role="status" className="hint">
          Highlighting {lit.label}: {names(lit).join(', ')}.{' '}
          <button type="button" className="secondary" onClick={() => onHighlight(null)}>
            Clear highlight
          </button>
        </p>
      )}
    </>
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
