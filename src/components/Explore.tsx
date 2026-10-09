import { useEffect, useMemo, useState } from 'react'
import { buildIndex, DEFAULT_FILTERS, type Filters } from '../../shared/graph'
import type { Api, GraphData } from '../api'
import type { Selection } from '../graph/selection'
import { BipartiteView } from './BipartiteView'
import { CategoryView } from './CategoryView'
import { DetailsPanel } from './DetailsPanel'
import { FilterBar } from './FilterBar'
import { MatrixView } from './MatrixView'
import { NetworkView } from './NetworkView'
import { HelpPanel } from './HelpPanel'
import { switcherExplanation, VIEW_GUIDE, viewExplanation } from '../explanations'
import { useExplain } from '../explain'

export type View = 'network' | 'matrix' | 'bipartite' | 'categories'

const VIEWS: { value: View; label: string }[] = [
  { value: 'network', label: 'Network' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'bipartite', label: 'People and terms' },
  { value: 'categories', label: 'By category' },
]

export function Explore({ api, refreshKey = 0, onGoToPeople }: { api: Api; refreshKey?: number; onGoToPeople?: () => void }) {
  const explain = useExplain()
  const [data, setData] = useState<GraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Filters and selection live here so every view reads the same ones.
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selection, setSelection] = useState<Selection>(null)
  const [view, setView] = useState<View>('network')

  useEffect(() => {
    let cancelled = false
    api
      .graph()
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [api, refreshKey])

  const index = useMemo(() => (data ? buildIndex(data) : null), [data])

  if (error)
    return (
      <p role="alert">
        {error} Check that the server is running, then reload the page.
      </p>
    )
  if (!index) return <p role="status">Loading…</p>
  if (index.data.people.length === 0)
    return (
      <p className="empty-state">
        Upload some profiles on the People tab to see how people relate.{' '}
        {onGoToPeople && (
          <button type="button" onClick={onGoToPeople}>
            Go to People
          </button>
        )}
      </p>
    )

  return (
    <section aria-labelledby="explore-h">
      <h2 id="explore-h">Explore</h2>
      <HelpPanel id="explore" title="How to use Explore">
        <p>
          Pick a <strong>view</strong>, then use the <strong>filters</strong> to decide what counts as a connection.
          Everything updates as you change them, and the filters apply to every view.
        </p>
        <p>
          In the network, <strong>click</strong> a person or a line to see what links them in the panel beside it, and{' '}
          <strong>drag</strong> people to rearrange them.
        </p>
      </HelpPanel>
      <div role="group" aria-label="View" {...explain.props(switcherExplanation)}>
        {VIEWS.map((v) => (
          <button
            key={v.value}
            aria-pressed={view === v.value}
            onClick={() => setView(v.value)}
            {...explain.props(viewExplanation(v.value))}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="help" data-testid="view-guide">
        <p>
          <strong>{VIEW_GUIDE[view].label}:</strong> {VIEW_GUIDE[view].summary}
        </p>
        <p className="help-alt">{VIEW_GUIDE[view].howToRead}</p>
      </div>
      <FilterBar index={index} filters={filters} onChange={setFilters} />
      {view === 'network' && (
        <div className="viz">
          <NetworkView index={index} filters={filters} selection={selection} onSelect={setSelection} />
          <DetailsPanel index={index} filters={filters} selection={selection} />
        </div>
      )}
      {view === 'matrix' && <MatrixView index={index} filters={filters} />}
      {view === 'bipartite' && <BipartiteView index={index} filters={filters} />}
      {view === 'categories' && <CategoryView index={index} filters={filters} />}
    </section>
  )
}
