// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Api, Term } from '../api'
import { Dictionary } from './Dictionary'

afterEach(cleanup)

const term = (over: Partial<Term> = {}): Term => ({
  id: 1,
  name: 'React',
  kind: 'skill',
  section: 'technical',
  category: 'Web and frontend',
  definition: 'A UI library.',
  sourceUrl: null,
  status: 'confirmed',
  builtin: true,
  individuals: 2,
  ...over,
})

/** An in-memory API so an edit made through the UI is what the next list call returns. */
function statefulApi(initial: Term[]) {
  let terms = initial
  return {
    listTerms: vi.fn(async () => terms),
    updateTerm: vi.fn(async (id: number, edit: { definition?: string; category?: string }) => {
      terms = terms.map((t) => (t.id === id ? { ...t, ...edit } : t))
      return terms.find((t) => t.id === id)!
    }),
    removeTerm: vi.fn(async (id: number) => {
      terms = terms.filter((t) => t.id !== id)
    }),
  } as unknown as Api
}

describe('Dictionary', () => {
  it('lists terms with category and marks custom and undefined ones', async () => {
    const api = statefulApi([term(), term({ id: 2, name: 'Zig', builtin: false, status: 'undefined', definition: null })])
    render(<Dictionary api={api} />)
    expect(await screen.findByText('React')).toBeInTheDocument()
    expect(screen.getAllByText(/Web and frontend/)).toHaveLength(2)
    expect(screen.getByText(/custom · undefined/)).toBeInTheDocument()
    expect(screen.getByText('No definition yet')).toBeInTheDocument()
  })

  it('shows an edited definition in the list', async () => {
    const api = statefulApi([term()])
    render(<Dictionary api={api} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit React' }))
    const box = screen.getByLabelText('Definition')
    await userEvent.clear(box)
    await userEvent.type(box, 'Components for UIs.')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const list = screen.getByRole('list', { name: 'Terms' })
    expect(await within(list).findByText('Components for UIs.')).toBeInTheDocument()
    expect(api.updateTerm).toHaveBeenCalledWith(1, { definition: 'Components for UIs.', category: 'Web and frontend' })
  })

  it('searches and filters through the API', async () => {
    const api = statefulApi([term()])
    render(<Dictionary api={api} />)
    await screen.findByText('React')
    await userEvent.type(screen.getByLabelText(/search terms/i), 'vue')
    await waitFor(() => expect(api.listTerms).toHaveBeenLastCalledWith({ q: 'vue' }))
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'value')
    await waitFor(() => expect(api.listTerms).toHaveBeenLastCalledWith({ q: 'vue', kind: 'value' }))
    await userEvent.click(screen.getByLabelText('Undefined only'))
    await waitFor(() =>
      expect(api.listTerms).toHaveBeenLastCalledWith({ q: 'vue', kind: 'value', status: 'undefined' }),
    )
  })

  it('deletes after confirming, warning when people use the term', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const api = statefulApi([term()])
    render(<Dictionary api={api} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete React' }))
    expect(confirm.mock.calls[0][0]).toMatch(/used by 2 people/)
    await waitFor(() => expect(screen.queryByText('React')).not.toBeInTheDocument())
  })
})
