// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Api, LookupOutcome, UnresolvedTerm } from '../api'
import { People } from './People'
import { ReviewTerms } from './ReviewTerms'

afterEach(cleanup)

const zig: UnresolvedTerm = { id: 10, name: 'Zig', kind: 'skill', section: 'technical', suggestions: [] }
const nim: UnresolvedTerm = { id: 11, name: 'Nim', kind: 'skill', section: 'technical', suggestions: [] }
const postgres: UnresolvedTerm = {
  id: 12,
  name: 'Postgres',
  kind: 'skill',
  section: 'technical',
  suggestions: [{ id: 2, name: 'PostgreSQL', reason: 'abbreviation' }],
}

const found: LookupOutcome = {
  proposal: {
    definition: 'Zig is a systems language.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Zig',
    sourceTitle: 'Zig (programming language)',
    provider: 'Wikipedia',
  },
  errors: [],
}

function fakeApi(over: Partial<Api> = {}): Api {
  return {
    lookup: vi.fn().mockResolvedValue(found),
    placement: vi.fn().mockResolvedValue({ section: 'technical', category: 'Languages', confidence: 0.6 }),
    updateTerm: vi.fn().mockResolvedValue({}),
    addAlias: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as Api
}

const card = (name: string) => screen.findByRole('article', { name })

describe('ReviewTerms privacy', () => {
  it('says what leaves the device where the user reviews terms', async () => {
    render(<ReviewTerms api={fakeApi()} terms={[zig]} />)
    expect(screen.getByTestId('privacy-note')).toHaveTextContent(/sent to Wikipedia/)
    await card('Zig')
  })
})

describe('ReviewTerms while the language model loads', () => {
  const later = <T,>() => {
    let resolve!: (v: T) => void
    const promise = new Promise<T>((r) => (resolve = r))
    return { promise, resolve }
  }

  it('shows the proposal at once and says a category suggestion is on its way', async () => {
    const placement = later<{ section: string; category: string; confidence: number } | null>()
    render(<ReviewTerms api={fakeApi({ placement: vi.fn().mockReturnValue(placement.promise) })} terms={[zig]} />)
    const c = within(await card('Zig'))
    expect(await c.findByDisplayValue('Zig is a systems language.')).toBeInTheDocument()
    expect(c.getByText(/looking for a category suggestion/i)).toBeInTheDocument()
    expect(c.getByRole('button', { name: 'Accept' })).toBeEnabled() // not held up by the model
  })

  it('fills in the suggested category when it arrives', async () => {
    const placement = later<{ section: string; category: string; confidence: number } | null>()
    render(<ReviewTerms api={fakeApi({ placement: vi.fn().mockReturnValue(placement.promise) })} terms={[zig]} />)
    const c = within(await card('Zig'))
    await c.findByDisplayValue('Zig is a systems language.')
    placement.resolve({ section: 'technical', category: 'Languages', confidence: 0.7 })
    expect(await c.findByDisplayValue('Languages')).toBeInTheDocument()
    expect(c.getByText(/suggested from similar terms/i)).toBeInTheDocument()
  })

  it('does not overwrite a category the user typed while waiting', async () => {
    const placement = later<{ section: string; category: string; confidence: number } | null>()
    render(<ReviewTerms api={fakeApi({ placement: vi.fn().mockReturnValue(placement.promise) })} terms={[zig]} />)
    const c = within(await card('Zig'))
    await c.findByDisplayValue('Zig is a systems language.')
    await userEvent.type(c.getByLabelText('Category'), 'Mine')
    placement.resolve({ section: 'technical', category: 'Languages', confidence: 0.7 })
    await waitFor(() => expect(c.queryByText(/looking for a category/i)).toBeNull())
    expect(c.getByLabelText('Category')).toHaveValue('Mine')
  })

  it('says suggestions are unavailable when the model cannot load, and still lets the user accept', async () => {
    const api = fakeApi({ placement: vi.fn().mockResolvedValue(null) })
    render(<ReviewTerms api={api} terms={[zig]} />)
    const c = within(await card('Zig'))
    expect(await c.findByText(/no category suggestion is available/i)).toBeInTheDocument()
    await userEvent.click(c.getByRole('button', { name: 'Accept' }))
    await waitFor(() => expect(api.updateTerm).toHaveBeenCalled())
  })

  it('looks up the next term without waiting for the previous one’s suggestion', async () => {
    const never = new Promise<null>(() => {})
    const api = fakeApi({ placement: vi.fn().mockReturnValue(never) })
    render(<ReviewTerms api={api} terms={[zig, nim]} />)
    await waitFor(() => expect(api.lookup).toHaveBeenCalledWith('Nim', 'skill', 'technical'))
  })
})

describe('ReviewTerms', () => {
  it('proposes a definition with its source and a suggested category, saving nothing yet', async () => {
    const api = fakeApi()
    render(<ReviewTerms api={api} terms={[zig]} />)
    const c = within(await card('Zig'))
    expect(await c.findByDisplayValue('Zig is a systems language.')).toBeInTheDocument()
    expect(c.getByDisplayValue('Languages')).toBeInTheDocument()
    expect(c.getByRole('link', { name: /Wikipedia: Zig \(programming language\)/ })).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Zig',
    )
    expect(api.lookup).toHaveBeenCalledWith('Zig', 'skill', 'technical')
    expect(api.updateTerm).not.toHaveBeenCalled()
  })

  it('accept saves the definition, source and category', async () => {
    const api = fakeApi()
    const onChange = vi.fn()
    render(<ReviewTerms api={api} terms={[zig]} onChange={onChange} />)
    const c = within(await card('Zig'))
    await c.findByDisplayValue('Zig is a systems language.')
    await userEvent.click(c.getByRole('button', { name: 'Accept' }))

    await waitFor(() =>
      expect(api.updateTerm).toHaveBeenCalledWith(10, {
        definition: 'Zig is a systems language.',
        sourceUrl: 'https://en.wikipedia.org/wiki/Zig',
        category: 'Languages',
        section: 'technical',
      }),
    )
    expect(await screen.findByText(': accepted')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()
  })

  it('lets the user edit the proposed definition before accepting', async () => {
    const api = fakeApi()
    render(<ReviewTerms api={api} terms={[zig]} />)
    const c = within(await card('Zig'))
    const box = await c.findByLabelText('Definition for Zig')
    await waitFor(() => expect(box).toHaveValue('Zig is a systems language.'))
    await userEvent.clear(box)
    await userEvent.type(box, 'My own words.')
    await userEvent.click(c.getByRole('button', { name: 'Accept' }))
    await waitFor(() =>
      expect(api.updateTerm).toHaveBeenCalledWith(10, expect.objectContaining({ definition: 'My own words.' })),
    )
  })

  it('reject saves nothing', async () => {
    const api = fakeApi()
    render(<ReviewTerms api={api} terms={[zig]} />)
    const c = within(await card('Zig'))
    await c.findByDisplayValue('Zig is a systems language.')
    await userEvent.click(c.getByRole('button', { name: 'Reject' }))
    expect(await screen.findByText(': rejected')).toBeInTheDocument()
    expect(api.updateTerm).not.toHaveBeenCalled()
  })

  it('skip saves nothing', async () => {
    const api = fakeApi()
    render(<ReviewTerms api={api} terms={[zig]} />)
    await userEvent.click(within(await card('Zig')).getByRole('button', { name: 'Skip' }))
    expect(await screen.findByText(': skipped')).toBeInTheDocument()
    expect(api.updateTerm).not.toHaveBeenCalled()
  })

  it('offers manual entry when the lookup finds nothing, and Accept needs a definition', async () => {
    const api = fakeApi({
      lookup: vi.fn().mockResolvedValue({ proposal: null, errors: [{ provider: 'Wikipedia', message: 'HTTP 503' }] }),
      placement: vi.fn().mockResolvedValue(null),
    })
    render(<ReviewTerms api={api} terms={[zig]} />)
    const c = within(await card('Zig'))
    expect(await c.findByText(/No definition found online \(HTTP 503\)/)).toBeInTheDocument()
    const accept = c.getByRole('button', { name: 'Accept' })
    expect(accept).toBeDisabled()

    await userEvent.type(c.getByLabelText('Definition for Zig'), 'A language I wrote down myself.')
    expect(accept).toBeEnabled()
    await userEvent.click(accept)
    await waitFor(() =>
      expect(api.updateTerm).toHaveBeenCalledWith(10, { definition: 'A language I wrote down myself.' }),
    )
  })

  it('survives a failed lookup request', async () => {
    const api = fakeApi({ lookup: vi.fn().mockRejectedValue(new Error('Request failed (500)')) })
    render(<ReviewTerms api={api} terms={[zig]} />)
    expect(await within(await card('Zig')).findByText(/Request failed \(500\)/)).toBeInTheDocument()
  })

  it('merges into a suggested existing term instead of defining a new one', async () => {
    const api = fakeApi()
    render(<ReviewTerms api={api} terms={[postgres]} />)
    const c = within(await card('Postgres'))
    await userEvent.click(c.getByRole('button', { name: 'Yes, use PostgreSQL' }))
    await waitFor(() => expect(api.addAlias).toHaveBeenCalledWith(2, 'Postgres'))
    expect(await screen.findByText(': merged')).toBeInTheDocument()
    expect(api.updateTerm).not.toHaveBeenCalled()
  })

  it('looks terms up one at a time', async () => {
    let active = 0
    let maxActive = 0
    const lookup = vi.fn(async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return found
    })
    render(<ReviewTerms api={fakeApi({ lookup })} terms={[zig, nim, postgres]} />)
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(3))
    expect(maxActive).toBe(1)
  })

  it('reports completion once every term is decided', async () => {
    const onDone = vi.fn()
    render(<ReviewTerms api={fakeApi()} terms={[zig, nim]} onDone={onDone} />)
    await userEvent.click(within(await card('Zig')).getByRole('button', { name: 'Skip' }))
    expect(onDone).not.toHaveBeenCalled()
    await userEvent.click(within(await card('Nim')).getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })
})

describe('upload then review', () => {
  it('imports first, so skipping every term still leaves the people imported', async () => {
    const api = {
      ...fakeApi(),
      listIndividuals: vi.fn().mockResolvedValue([{ id: 1, name: 'alex', termCount: 2 }]),
      upload: vi.fn().mockResolvedValue({
        imported: [{ id: 1, name: 'alex' }],
        errors: [],
        conflicts: [],
        unresolved: [zig, nim],
      }),
    } as unknown as Api
    render(<People api={api} />)
    await userEvent.upload(screen.getByLabelText(/upload profile/i), new File(['{}'], 'alex.json'))

    expect(await screen.findByText(/imported 1 profile/i)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Review new terms' })).toBeInTheDocument()
    await userEvent.click(within(await card('Zig')).getByRole('button', { name: 'Skip' }))
    await userEvent.click(within(await card('Nim')).getByRole('button', { name: 'Skip' }))

    expect(screen.getByRole('list', { name: 'Individuals' })).toHaveTextContent('alex')
    expect(api.updateTerm).not.toHaveBeenCalled()
  })
})
