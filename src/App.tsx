import { useState } from 'react'
import { api } from './api'
import { Dictionary } from './components/Dictionary'
import { Explore } from './components/Explore'
import { People } from './components/People'
import { ThemeToggle } from './components/ThemeToggle'

type Tab = 'people' | 'explore' | 'dictionary'

export function App() {
  const [tab, setTab] = useState<Tab>('people')
  // Bumped when people change so the dictionary reloads (uploads can add terms).
  const [version, setVersion] = useState(0)

  return (
    <main>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1>Profile Visualiser</h1>
        <ThemeToggle />
      </header>
      <nav aria-label="Sections">
        <button aria-pressed={tab === 'people'} onClick={() => setTab('people')}>
          People
        </button>{' '}
        <button aria-pressed={tab === 'explore'} onClick={() => setTab('explore')}>
          Explore
        </button>{' '}
        <button aria-pressed={tab === 'dictionary'} onClick={() => setTab('dictionary')}>
          Dictionary
        </button>
      </nav>
      {tab === 'people' && <People api={api} onChange={() => setVersion((v) => v + 1)} />}
      {tab === 'explore' && <Explore api={api} refreshKey={version} />}
      {tab === 'dictionary' && <Dictionary api={api} refreshKey={version} />}
    </main>
  )
}
