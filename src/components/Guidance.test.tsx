// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api, Term } from '../api'
import { ExplainProvider } from '../explain'
import { makeApi } from '../test-utils'
import { Dictionary } from './Dictionary'
import { People } from './People'

beforeEach(() => sessionStorage.clear())
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

const dictionary = async (terms: Term[]) => {
  const api = makeApi({ listTerms: vi.fn().mockResolvedValue(terms) }) as Api
  render(
    <ExplainProvider>
      <Dictionary api={api} />
    </ExplainProvider>,
  )
  await screen.findByRole('list', { name: 'Terms' })
}

describe('Dictionary guidance and explanations', () => {
  it('explains the page and describes search and the status filter', async () => {
    await dictionary([term()])
    expect(screen.getByRole('complementary', { name: /how to use the dictionary/i })).toBeInTheDocument()
    expect(screen.getByText(/search by name, filter by type/i)).toBeInTheDocument()
  })

  it('shows a term’s definition, kind and category on right-click', async () => {
    await dictionary([term()])
    fireEvent.contextMenu(screen.getByRole('listitem'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('React')
    expect(dialog).toHaveTextContent('A UI library.')
    expect(dialog).toHaveTextContent('Skill · Technical development · Web and frontend')
  })

  it('says so when a custom term has no definition, and points to where to add one', async () => {
    await dictionary([term({ id: 2, name: 'Svelte', definition: null, status: 'undefined', builtin: false })])
    fireEvent.contextMenu(screen.getByRole('listitem'))
    expect(screen.getByRole('dialog')).toHaveTextContent(/no definition is available for this term yet/i)
    expect(screen.getByRole('dialog')).toHaveTextContent(/dictionary tab, or through term review/i)
  })

  it('explains the status labels separately from the term itself', async () => {
    await dictionary([term({ id: 2, name: 'Svelte', definition: null, status: 'undefined', builtin: false })])
    fireEvent.contextMenu(screen.getByText(/· custom/))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Undefined term')
  })

  it('groups terms by profile section for the accent colour', async () => {
    await dictionary([term(), term({ id: 3, name: 'Trust', kind: 'value', section: null })])
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('data-section', 'technical')
    expect(items[1]).toHaveAttribute('data-section', 'values')
  })
})

describe('People guidance', () => {
  const render2 = (api: Api) =>
    render(
      <ExplainProvider>
        <People api={api} />
      </ExplainProvider>,
    )

  it('says what the upload takes and where the name comes from, and how to start', () => {
    render2(makeApi())
    expect(screen.getByRole('complementary', { name: /how to use people/i })).toBeInTheDocument()
    expect(screen.getByText(/file name becomes their name/i)).toBeInTheDocument()
    expect(screen.getByText(/no profiles uploaded yet/i)).toHaveTextContent(/upload profile json files/i)
  })

  it('describes the replace / keep-both choice next to the buttons', async () => {
    const api = makeApi({
      upload: vi.fn().mockResolvedValue({
        imported: [],
        errors: [],
        conflicts: [{ file: 'a.json', name: 'a', existingId: 1 }],
        unresolved: [],
      }),
    })
    render2(api)
    await userEvent.upload(screen.getByLabelText(/upload profile/i), new File(['{}'], 'a.json'))
    expect(await screen.findByText(/overwrites that person’s profile/i)).toBeInTheDocument()
  })

  it('explains a person on right-click', async () => {
    render2(makeApi({ listIndividuals: vi.fn().mockResolvedValue([{ id: 1, name: 'alex', termCount: 3 }]) }))
    fireEvent.contextMenu(await screen.findByText('alex'))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('alex')
    expect(screen.getByRole('dialog')).toHaveTextContent('3 terms')
  })

  it('keeps Rename and Delete working inside an explainable row', async () => {
    const api = makeApi({
      listIndividuals: vi.fn().mockResolvedValue([{ id: 1, name: 'alex', termCount: 3 }]),
      rename: vi.fn().mockResolvedValue({}),
    })
    render2(api)
    await userEvent.click(await screen.findByRole('button', { name: 'Rename' }))
    await userEvent.clear(screen.getByLabelText('Display name'))
    await userEvent.type(screen.getByLabelText('Display name'), 'alexa')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(api.rename).toHaveBeenCalledWith(1, 'alexa')
    expect(within(screen.getByRole('list', { name: 'Individuals' })).queryByRole('dialog')).toBeNull()
  })
})

describe('privacy note', () => {
  it('states exactly what leaves the device, on the People page', () => {
    render(
      <ExplainProvider>
        <People api={makeApi()} />
      </ExplainProvider>,
    )
    const note = screen.getByTestId('privacy-note')
    expect(note).toHaveTextContent(/profile contents, names and file names never do/i)
    expect(note).toHaveTextContent(/sent to Wikipedia/)
    expect(note).toHaveTextContent(/huggingface\.co/)
    expect(note).toHaveTextContent(/cdn\.jsdelivr\.net/)
  })
})
