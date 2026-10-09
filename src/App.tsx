import { api } from './api'
import { People } from './components/People'

export function App() {
  return (
    <main>
      <h1>Profile Visualiser</h1>
      <People api={api} />
    </main>
  )
}
