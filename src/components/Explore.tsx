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

export type View = 'network' | 'matrix' | 'bipartite' | 'categories'

const VIEWS: { value: View; label: string }[] = [
  { value: 'network', label: 'Network' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'bipartite', label: 'People and terms' },
  { value: 'categories', label: 'By category' },
]

export function Explore({ api, refreshKey = 0 }: { api: Api; refreshKey?: number }) {
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

  if (error) return <p role="alert">{error}</p>
  if (!index) return <p role="status">Loading…</p>
  if (index.data.people.length === 0) return <p>Upload some profiles on the People tab to see how people relate.</p>

  return (
    <section aria-labelledby="explore-h">
      <h2 id="explore-h">Explore</h2>
      <div role="group" aria-label="View">
        {VIEWS.map((v) => (
          <button key={v.value} aria-pressed={view === v.value} onClick={() => setView(v.value)}>
            {v.label}
          </button>
        ))}
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
