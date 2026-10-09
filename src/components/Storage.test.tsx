// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setSaveState } from '../storage-state'
import { makeApi } from '../test-utils'
import { People } from './People'
import { StorageNotice } from './StorageNotice'

afterEach(() => {
  cleanup()
  setSaveState({ kind: 'saved' })
  vi.restoreAllMocks()
})

describe('Clear all data', () => {
  const withPeople = () =>
    makeApi({ listIndividuals: vi.fn().mockResolvedValue([{ id: 1, name: 'alex', termCount: 3 }]) })

  it('explains what it does, and clears after the user confirms', async () => {
    const api = withPeople()
    const onChange = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<People api={api} onChange={onChange} />)
    expect(screen.getByText(/kept in this browser only/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/cannot be undone/))
    await waitFor(() => expect(api.clearAll).toHaveBeenCalledTimes(1))
    expect(onChange).toHaveBeenCalled()
  })

  it('does nothing when the user cancels', async () => {
    const api = withPeople()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<People api={api} />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(api.clearAll).not.toHaveBeenCalled()
    expect(await screen.findByText('alex')).toBeInTheDocument()
  })

  it('shows the empty state after clearing', async () => {
    const list = vi.fn().mockResolvedValueOnce([{ id: 1, name: 'alex', termCount: 3 }]).mockResolvedValue([])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<People api={makeApi({ listIndividuals: list })} />)
    await screen.findByText('alex')
    await userEvent.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(await screen.findByText(/no profiles uploaded yet/i)).toBeInTheDocument()
  })

  it('reports a failure instead of silently doing nothing', async () => {
    const api = makeApi({ clearAll: vi.fn().mockRejectedValue(new Error('disk full')) })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<People api={api} />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('disk full')
  })

  it('reloads the list when told the data changed under the page', async () => {
    const list = vi.fn().mockResolvedValue([])
    const { rerender } = render(<People api={makeApi({ listIndividuals: list })} refreshKey={0} />)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    rerender(<People api={makeApi({ listIndividuals: list })} refreshKey={1} />)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})

describe('storage notice', () => {
  it('says nothing while saving works', () => {
    render(<StorageNotice />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says data will not be saved, and why, when storage is unavailable', () => {
    render(<StorageNotice />)
    act(() => setSaveState({ kind: 'memory-only', reason: 'IndexedDB is not available in this browser' }))
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent('Your data will not be saved')
    expect(notice).toHaveTextContent('IndexedDB is not available')
    expect(notice).toHaveTextContent(/lost when you close or reload/)
  })

  it('says the last change was not saved, then goes away once saving works again', () => {
    render(<StorageNotice />)
    act(() => setSaveState({ kind: 'save-failed', reason: 'quota exceeded' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/last change was not saved.*quota exceeded/)
    act(() => setSaveState({ kind: 'saved' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
