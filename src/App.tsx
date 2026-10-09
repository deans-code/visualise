import { useState } from 'react'
import { api } from './api'
import { Dictionary } from './components/Dictionary'
import { People } from './components/People'

type Tab = 'people' | 'dictionary'

export function App() {
  const [tab, setTab] = useState<Tab>('people')
  // Bumped when people change so the dictionary reloads (uploads can add terms).
  const [version, setVersion] = useState(0)

  return (
    <main>
      <h1>Profile Visualiser</h1>
      <nav aria-label="Sections">
        <button aria-pressed={tab === 'people'} onClick={() => setTab('people')}>
          People
        </button>{' '}
        <button aria-pressed={tab === 'dictionary'} onClick={() => setTab('dictionary')}>
          Dictionary
        </button>
      </nav>
      {tab === 'people' ? (
        <People api={api} onChange={() => setVersion((v) => v + 1)} />
      ) : (
        <Dictionary api={api} refreshKey={version} />
      )}
    </main>
  )
}
