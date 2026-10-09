// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setSaveState } from './storage-state'
import { makeApi } from './test-utils'

afterEach(() => {
  cleanup()
  setSaveState({ kind: 'saved' })
  vi.resetModules()
  vi.doUnmock('./api')
})

/** The App with the data layer replaced, so what the page does when it starts (or cannot) can be tested. */
async function renderApp(start: () => Promise<unknown>) {
  vi.resetModules()
  vi.doMock('./api', () => ({ api: makeApi(), start }))
  const { App } = await import('./App')
  return render(<App />)
}

describe('starting up', () => {
  it('shows a loading state, then the pages', async () => {
    let ready!: () => void
    await renderApp(() => new Promise((r) => (ready = () => r(undefined))))
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    await act(async () => ready())
    expect(await screen.findByRole('heading', { name: 'People' })).toBeInTheDocument()
  })

  it('explains, instead of showing a blank page, when the browser cannot run WebAssembly', async () => {
    await renderApp(() => Promise.reject(new Error('This browser cannot run WebAssembly, which the visualiser needs. Please use a current browser.')))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('could not start')
    expect(alert).toHaveTextContent('cannot run WebAssembly')
    expect(screen.queryByRole('heading', { name: 'People' })).toBeNull()
  })

  it('still starts, and says data will not be saved, when IndexedDB is unavailable', async () => {
    await renderApp(async () => {
      // The App reads the state from its own copy of the module (the registry was reset for the mock above).
      const { setSaveState: set } = await import('./storage-state')
      set({ kind: 'memory-only', reason: 'IndexedDB is not available in this browser' })
    })
    expect(await screen.findByRole('heading', { name: 'People' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/will not be saved.*IndexedDB is not available/)
  })
})
