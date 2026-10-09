import { useEffect, useState } from 'react'
import { api, start } from './api'
import { Dictionary } from './components/Dictionary'
import { Explore } from './components/Explore'
import { People } from './components/People'
import { StorageNotice } from './components/StorageNotice'
import { ThemeToggle } from './components/ThemeToggle'
import { ExplainProvider } from './explain'
import { DATA_REPLACED } from './storage-state'

type Tab = 'people' | 'explore' | 'dictionary'

/** Opens the in-browser data layer, and says what is wrong if the browser cannot. */
function Boot({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | { error: string }>('loading')
  useEffect(() => {
    let cancelled = false
    start().then(
      () => !cancelled && setState('ready'),
      (e: Error) => !cancelled && setState({ error: e.message }),
    )
    return () => {
      cancelled = true
    }
  }, [])
  if (state === 'loading') return <p role="status">Loading…</p>
  if (state !== 'ready')
    return (
      <p role="alert" className="empty-state">
        <strong>The visualiser could not start.</strong> {state.error}
      </p>
    )
  return <>{children}</>
}

export function App() {
  const [tab, setTab] = useState<Tab>('people')
  // Bumped when the data changes so the other pages reload (uploads can add terms, and another tab can save).
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    window.addEventListener(DATA_REPLACED, bump)
    return () => window.removeEventListener(DATA_REPLACED, bump)
  }, [])

  return (
    <ExplainProvider>
      <main>
        <header className="app-header">
          <h1>Profile Visualiser</h1>
          <ThemeToggle />
        </header>
        <StorageNotice />
        <nav aria-label="Sections">
          <button aria-pressed={tab === 'people'} onClick={() => setTab('people')}>
            People
          </button>
          <button aria-pressed={tab === 'explore'} onClick={() => setTab('explore')}>
            Explore
          </button>
          <button aria-pressed={tab === 'dictionary'} onClick={() => setTab('dictionary')}>
            Dictionary
          </button>
        </nav>
        <Boot>
          {tab === 'people' && <People api={api} refreshKey={version} onChange={() => setVersion((v) => v + 1)} />}
          {tab === 'explore' && <Explore api={api} refreshKey={version} onGoToPeople={() => setTab('people')} />}
          {tab === 'dictionary' && <Dictionary api={api} refreshKey={version} />}
        </Boot>
      </main>
    </ExplainProvider>
  )
}
