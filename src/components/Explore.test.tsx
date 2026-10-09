// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE } from '../graph/fixture'
import { makeApi } from '../test-utils'
import { Explore } from './Explore'

afterEach(cleanup)

const open = async () => {
  const api = makeApi({ graph: vi.fn().mockResolvedValue(FIXTURE) })
  const view = render(<Explore api={api} />)
  await screen.findByTestId('network')
  return view
}

const edge = (c: HTMLElement, a: number, b: number) =>
  c.querySelector<SVGElement>(`[data-edge="${a}-${b}"]`) ?? c.querySelector<SVGElement>(`[data-edge="${b}-${a}"]`)
const node = (c: HTMLElement, id: number) => c.querySelector<SVGElement>(`[data-person="${id}"]`)!
const slider = (name: RegExp) => screen.getByLabelText(name) as HTMLInputElement
const setSlider = (name: RegExp, value: number) => fireEvent.change(slider(name), { target: { value: String(value) } })

describe('Explore network', () => {
  it('shows loading, then the network, and an empty state with no people', async () => {
    const empty = makeApi()
    render(<Explore api={empty} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(await screen.findByText(/upload some profiles/i)).toBeInTheDocument()
  })

  it('connects a strong pair, connects an adjacent-only pair more weakly, and isolates the unrelated person', async () => {
    const { container } = await open()
    setSlider(/hide weaker/i, 0.1)

    const strong = edge(container, 1, 3)!
    const weak = edge(container, 1, 2)!
    expect(strong).toBeTruthy()
    expect(weak).toBeTruthy()
    expect(Number(strong.getAttribute('data-weight'))).toBeGreaterThan(Number(weak.getAttribute('data-weight')))
    expect(Number(strong.getAttribute('stroke-width'))).toBeGreaterThan(Number(weak.getAttribute('stroke-width')))

    expect(node(container, 4).getAttribute('data-connected')).toBe('false')
    expect(node(container, 1).getAttribute('data-connected')).toBe('true')
    expect(container.querySelector('[data-edge$="-4"], [data-edge^="4-"]')).toBeNull()
  })

  it('drops the adjacent-only edge when related terms are set to exact only', async () => {
    const { container } = await open()
    setSlider(/hide weaker/i, 0.1)
    expect(edge(container, 1, 2)).toBeTruthy()

    setSlider(/related terms count/i, 0)
    expect(screen.getByText('exact only')).toBeInTheDocument()
    expect(edge(container, 1, 2)).toBeNull()
    expect(edge(container, 1, 3)).toBeTruthy()
  })

  it('hides weak edges with the threshold slider', async () => {
    const { container } = await open()
    setSlider(/hide weaker/i, 0.95)
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(0)
  })

  it('switches the basis to values', async () => {
    const { container } = await open()
    await userEvent.click(screen.getByRole('radio', { name: 'Shared values' }))
    // Only Alex and Di share a value.
    expect(edge(container, 1, 4)).toBeTruthy()
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(1)
  })

  it('applies the skill-area filter to skills but disables it for values', async () => {
    const { container } = await open()
    const technical = screen.getByRole('checkbox', { name: 'Technical development' })
    await userEvent.click(technical)
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(0)

    await userEvent.click(screen.getByRole('radio', { name: 'Shared values' }))
    expect(screen.getByRole('group', { name: /skill areas/i })).toBeDisabled()
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(1)
  })

  it('focuses on a single term', async () => {
    const { container } = await open()
    fireEvent.change(screen.getByLabelText(/focus on a term/i), { target: { value: 'Vue' } })
    expect(screen.getByRole('list', { name: 'Focused terms' })).toHaveTextContent('Vue')
    setSlider(/hide weaker/i, 0.1)
    // Only Bo and Cy have Vue; Alex has React, which is not in focus.
    expect(edge(container, 2, 3)).toBeTruthy()
    expect(edge(container, 1, 3)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Stop focusing on Vue' }))
    expect(screen.queryByRole('list', { name: 'Focused terms' })).toBeNull()
  })

  it('draws directed could-help links for the complementary basis', async () => {
    const { container } = await open()
    await userEvent.click(screen.getByRole('radio', { name: 'Could help' }))
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(0)
    // Bo (has Rust) -> Alex (wants Rust), exact. Cy (has React) -> Bo (wants React), exact.
    expect(container.querySelector('[data-help="2>1"]')).toBeTruthy()
    expect(container.querySelector('[data-help="3>2"]')).toBeTruthy()
    // Alex (React) -> Di (wants Vue) is approximate but present at the default adjacency.
    expect(container.querySelector('[data-help="1>4"]')).toBeTruthy()
    expect(container.querySelector('[data-help="4>1"]')).toBeNull()
  })

  it('labels every person, names their group, and explains the groups in a legend', async () => {
    const { container } = await open()
    setSlider(/hide weaker/i, 0.1)
    for (const name of ['Alex', 'Bo', 'Cy', 'Di']) expect(within(container).getAllByText(name).length).toBeGreaterThan(0)
    expect(node(container, 4)).toHaveAttribute('aria-label', 'Di, not connected')
    const legend = screen.getByRole('list', { name: 'Groups' })
    expect(within(legend).getByText(/Group 1/)).toBeInTheDocument()
    expect(within(legend).getByText(/Not connected under these filters \(1\)/)).toBeInTheDocument()
  })

  it('offers the connections as a table', async () => {
    await open()
    await userEvent.click(screen.getByText('Show connections as a table'))
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Similarity' })).toBeInTheDocument()
  })
})

describe('Explore details panel', () => {
  const panel = () => screen.getByRole('complementary', { name: 'Details' })

  it('prompts before anything is selected', async () => {
    await open()
    expect(within(panel()).getByText(/select a person or a connection/i)).toBeInTheDocument()
  })

  it('explains an adjacent-only connection with the related pair, its reasons and both definitions', async () => {
    const { container } = await open()
    fireEvent.click(edge(container, 1, 2)!.parentElement!)
    const p = within(panel())
    expect(p.getByRole('heading', { name: 'Alex and Bo' })).toBeInTheDocument()
    expect(p.queryByLabelText('Shared terms')).toBeNull()
    const related = within(p.getByLabelText('Related terms'))
    expect(related.getByText('React ↔ Vue')).toBeInTheDocument()
    expect(related.getByText('same category: Web and frontend, similar definitions')).toBeInTheDocument()

    // Definitions are on demand.
    await userEvent.click(related.getAllByText('Vue')[0])
    expect(related.getAllByText('Vue is a thing.')[0]).toBeVisible()
  })

  it('lists exactly shared terms for a strong connection', async () => {
    const { container } = await open()
    fireEvent.click(edge(container, 1, 3)!.parentElement!)
    const shared = within(within(panel()).getByLabelText('Shared terms'))
    expect(shared.getByText('React')).toBeInTheDocument()
  })

  it('shows a person with their values, experience and wishes', async () => {
    const { container } = await open()
    fireEvent.click(node(container, 1))
    const p = within(panel())
    expect(p.getByRole('heading', { name: 'Alex' })).toBeInTheDocument()
    expect(within(p.getByLabelText('Values')).getByText('Trust')).toBeInTheDocument()
    expect(within(p.getByLabelText('Experience')).getByText('React')).toBeInTheDocument()
    expect(within(p.getByLabelText('Wants to learn')).getByText('Rust')).toBeInTheDocument()
    expect(p.getByLabelText('Most similar')).toHaveTextContent('Cy')
  })

  it('shows an approximate could-help link as approximate, with reasons', async () => {
    const { container } = await open()
    await userEvent.click(screen.getByRole('radio', { name: 'Could help' }))
    fireEvent.click(container.querySelector('[data-help="1>4"]')!.parentElement!)
    const p = within(panel())
    expect(p.getByRole('heading', { name: 'Alex could help Di' })).toBeInTheDocument()
    expect(p.getByText('React → Vue')).toBeInTheDocument()
    expect(p.getByText('approximate match')).toBeInTheDocument()
  })

  it('does not mark an exact could-help match as approximate', async () => {
    const { container } = await open()
    await userEvent.click(screen.getByRole('radio', { name: 'Could help' }))
    fireEvent.click(container.querySelector('[data-help="2>1"]')!.parentElement!)
    const p = within(panel())
    expect(p.getByText('Rust')).toBeInTheDocument()
    expect(p.queryByText('approximate match')).toBeNull()
  })

  it('says so when the selected connection is filtered away', async () => {
    const { container } = await open()
    fireEvent.click(edge(container, 1, 2)!.parentElement!)
    setSlider(/related terms count/i, 0)
    expect(within(panel()).getByText(/hidden by the current filters/i)).toBeInTheDocument()
  })
})

describe('Explore matrix', () => {
  const toMatrix = async () => {
    const view = await open()
    await userEvent.click(screen.getByRole('button', { name: 'Matrix' }))
    return view
  }
  const cell = (container: HTMLElement, termName: string, personId: number) => {
    const row = [...container.querySelectorAll('tr[data-term]')].find((r) => r.querySelector('th')?.textContent === termName)!
    return row.querySelector<HTMLElement>(`td[data-person="${personId}"]`)!
  }

  it('marks who has each term and who only has a related one', async () => {
    const { container } = await toMatrix()
    expect(cell(container, 'React', 1)).toHaveTextContent('●')
    expect(cell(container, 'React', 2)).toHaveTextContent('≈') // Bo has Vue
    expect(cell(container, 'React', 4)).toHaveTextContent('')
    expect(cell(container, 'React', 4).getAttribute('data-level')).toBe('0')
    expect(cell(container, 'Vue', 2)).toHaveTextContent('●')
    expect(cell(container, 'Mentoring', 4)).toHaveTextContent('●')
  })

  it('describes each cell for assistive technology', async () => {
    const { container } = await toMatrix()
    expect(cell(container, 'React', 1)).toHaveAttribute('aria-label', 'Alex has React')
    expect(cell(container, 'React', 2).getAttribute('aria-label')).toMatch(/^Bo has related Vue \(50%\)$/)
    expect(cell(container, 'React', 4)).toHaveAttribute('aria-label', 'Di does not have React')
  })

  it('counts how many people have each term', async () => {
    const { container } = await toMatrix()
    const row = [...container.querySelectorAll('tr[data-term]')].find((r) => r.querySelector('th')?.textContent === 'React')!
    expect(row.lastElementChild).toHaveTextContent('2')
  })

  it('groups terms under area and category headings', async () => {
    await toMatrix()
    const table = screen.getByRole('table', { name: 'People by term' })
    expect(within(table).getByText('Technical development · Web and frontend')).toBeInTheDocument()
    expect(within(table).getByText('Interpersonal · Leadership')).toBeInTheDocument()
  })

  it('keeps the filters when switching views, and follows them', async () => {
    const { container } = await open()
    setSlider(/related terms count/i, 0)
    await userEvent.click(screen.getByRole('button', { name: 'Matrix' }))
    expect(slider(/related terms count/i).value).toBe('0')
    expect(cell(container, 'React', 2)).not.toHaveTextContent('≈')

    await userEvent.click(screen.getByRole('button', { name: 'Network' }))
    expect(slider(/related terms count/i).value).toBe('0')
    expect(screen.getByTestId('network')).toBeInTheDocument()
  })

  it('shows values rows for the values basis and honours the skill-area filter otherwise', async () => {
    const { container } = await toMatrix()
    await userEvent.click(screen.getByRole('radio', { name: 'Shared values' }))
    expect(cell(container, 'Trust', 1)).toHaveTextContent('●')
    expect(container.querySelector('tr[data-term]')?.querySelector('th')).toHaveTextContent('Trust')
    expect(container.querySelectorAll('tr[data-term]')).toHaveLength(1)

    await userEvent.click(screen.getByRole('radio', { name: 'Experience' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Technical development' }))
    expect(within(container).queryByText('React')).toBeNull()
    expect(within(container).getByText('Mentoring')).toBeInTheDocument()
  })

  it('marks what people want to learn for the could-help basis', async () => {
    const { container } = await toMatrix()
    await userEvent.click(screen.getByRole('radio', { name: 'Could help' }))
    // Bo wants React, Alex wants Rust.
    expect(cell(container, 'React', 2).getAttribute('aria-label')).toMatch(/wants to learn it$/)
    expect(cell(container, 'Rust', 1).getAttribute('aria-label')).toBe('Alex does not have Rust; wants to learn it')
    expect(cell(container, 'Rust', 2)).toHaveTextContent('●')
  })

  it('says so when nothing matches', async () => {
    await toMatrix()
    fireEvent.change(screen.getByLabelText(/focus on a term/i), { target: { value: 'Trust' } })
    await userEvent.click(screen.getByRole('radio', { name: 'Experience' }))
    expect(screen.getByText(/no terms match/i)).toBeInTheDocument()
  })
})

describe('Explore people-and-terms view', () => {
  const toBipartite = async () => {
    const view = await open()
    await userEvent.click(screen.getByRole('button', { name: 'People and terms' }))
    return view
  }
  const link = (c: HTMLElement, person: number, termName: string) => {
    const termId = [...c.querySelectorAll('[data-term]')].find((g) => g.textContent?.startsWith(termName))!.getAttribute('data-term')
    return c.querySelector<SVGElement>(`[data-link="${person}-${termId}"]`)
  }

  it('draws a line for each term a person has and counts the people per term', async () => {
    const { container } = await toBipartite()
    expect(link(container, 1, 'React')).toBeTruthy()
    expect(link(container, 3, 'React')).toBeTruthy()
    expect(link(container, 2, 'React')).toBeNull() // Bo has Vue, not React
    expect(screen.getByText('React (2)')).toBeInTheDocument()
    expect(screen.getByText('Vue (2)')).toBeInTheDocument()
  })

  it('shows only shared terms at first, and reveals one-person terms on request', async () => {
    const { container } = await toBipartite()
    expect(screen.queryByText('Mentoring (1)')).toBeNull()
    expect(screen.queryByText('Rust (1)')).toBeNull()
    const toggle = screen.getByRole('checkbox', { name: /also show terms only one person has \(\d+ hidden\)/i })
    await userEvent.click(toggle)
    expect(screen.getByText('Mentoring (1)')).toBeInTheDocument()
    expect(link(container, 4, 'Mentoring')).toBeTruthy()
    await userEvent.click(screen.getByRole('checkbox', { name: /also show terms only one person has$/i }))
    expect(screen.queryByText('Mentoring (1)')).toBeNull()
  })

  it('highlights one person’s lines and dims the rest', async () => {
    const { container } = await toBipartite()
    await userEvent.click(screen.getByRole('button', { name: /^Alex: .* terms/ }))
    expect(link(container, 1, 'React')!.getAttribute('data-dim')).toBe('false')
    expect(link(container, 3, 'React')!.getAttribute('data-dim')).toBe('true')

    await userEvent.click(screen.getByRole('button', { name: /^Alex: .* terms/ }))
    expect(link(container, 3, 'React')!.getAttribute('data-dim')).toBe('false')
  })

  it('highlights everyone who has a term', async () => {
    const { container } = await toBipartite()
    await userEvent.click(screen.getByRole('checkbox', { name: /also show terms only one person has/i }))
    await userEvent.click(screen.getByRole('button', { name: /^React: 2 people/ }))
    expect(link(container, 1, 'React')!.getAttribute('data-dim')).toBe('false')
    expect(link(container, 4, 'Mentoring')!.getAttribute('data-dim')).toBe('true')
  })

  it('follows the shared filters', async () => {
    const { container } = await toBipartite()
    await userEvent.click(screen.getByRole('radio', { name: 'Shared values' }))
    expect(container.querySelectorAll('[data-link]')).toHaveLength(2) // Trust for Alex and Di
    expect(screen.getByText('Trust (2)')).toBeInTheDocument()
  })
})

describe('Explore legend cues beyond colour', () => {
  it('gives each group a different shape as well as a different colour', async () => {
    // Two separate pairs of people with identical skills inside each pair.
    const term = (id: number, name: string) => ({ id, name, kind: 'skill' as const, section: 'technical', category: 'X', definition: null })
    const links = (p: number, t: number) => ({ person: p, term: t, role: 'experience' as const })
    const data = {
      people: [1, 2, 3, 4].map((id) => ({ id, name: `P${id}` })),
      terms: [term(1, 'Go'), term(2, 'Mentoring')],
      links: [links(1, 1), links(2, 1), links(3, 2), links(4, 2)],
      related: [],
    }
    render(<Explore api={makeApi({ graph: vi.fn().mockResolvedValue(data) })} />)
    await screen.findByTestId('network')

    const items = within(screen.getByRole('list', { name: 'Groups' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    const mark = (li: HTMLElement) => li.querySelector('svg')!.firstElementChild!
    expect(mark(items[0]).tagName).not.toBe(mark(items[1]).tagName)
    expect(mark(items[0]).getAttribute('class')).toContain('group-1')
    expect(mark(items[1]).getAttribute('class')).toContain('group-2')
    expect(items[0]).toHaveTextContent('Group 1')
    expect(items[1]).toHaveTextContent('Group 2')
  })
})

describe('Explore category view', () => {
  const term = (id: number, name: string, section: string, category: string) => ({ id, name, kind: 'skill' as const, section, category, definition: null })
  const link = (person: number, t: number) => ({ person, term: t, role: 'experience' as const })
  // Ann has Go, Ben has Zig (different terms, same category); Ben also has Terraform; Cat is in a different world.
  const langData = {
    people: [1, 2, 3].map((id) => ({ id, name: ['', 'Ann', 'Ben', 'Cat'][id] })),
    terms: [term(10, 'Go', 'technical', 'Languages'), term(11, 'Zig', 'technical', 'Languages'), term(12, 'Terraform', 'technical', 'Cloud and DevOps'), term(13, 'Mentoring', 'interpersonal', 'Leadership')],
    links: [link(1, 10), link(2, 11), link(2, 12), link(3, 13)],
    related: [],
  }
  const openCategories = async (graph = langData) => {
    const view = render(<Explore api={makeApi({ graph: vi.fn().mockResolvedValue(graph) })} />)
    await screen.findByTestId('network')
    await userEvent.click(screen.getByRole('button', { name: 'By category' }))
    return view
  }
  const cell = (c: HTMLElement, category: string, personId: number) =>
    c.querySelector<HTMLElement>(`tr[data-category$=":${category}"] td[data-person="${personId}"]`)!

  it('gives two people weight in the same category even though they share no term', async () => {
    const { container } = await openCategories()
    expect(cell(container, 'Languages', 1)).toHaveTextContent('1')
    expect(cell(container, 'Languages', 2)).toHaveTextContent('1')
    expect(cell(container, 'Languages', 1)).toHaveAttribute('aria-label', 'Ann: 1 term in Languages')
    expect(cell(container, 'Languages', 3)).toHaveTextContent('')
  })

  it('shades by each person’s own share and counts who is in each category', async () => {
    const { container } = await openCategories()
    // Ben has one term in each of two categories, so both are at his maximum.
    expect(cell(container, 'Languages', 2).getAttribute('data-level')).toBe('5')
    expect(cell(container, 'Cloud and DevOps', 2).getAttribute('data-level')).toBe('5')
    expect(cell(container, 'Languages', 3).getAttribute('data-level')).toBe('0')
    const row = container.querySelector('tr[data-category$=":Languages"]')!
    expect(row.lastElementChild).toHaveTextContent('2')
  })

  it('subtotals each skill area', async () => {
    const { container } = await openCategories()
    const technical = [...container.querySelectorAll('tr.domain-row')].find((r) => r.textContent?.startsWith('Technical development'))!
    expect(technical.querySelector('td[data-person="2"]')).toHaveTextContent('2')
    expect(technical.querySelector('td[data-person="3"]')).toHaveTextContent('')
  })

  it('lists who is closest by category, strongest first', async () => {
    const { container } = await openCategories()
    const pairs = [...container.querySelectorAll('tr[data-pair]')]
    expect(pairs[0].getAttribute('data-pair')).toBe('1-2')
    expect(Number(pairs[0].getAttribute('data-closeness'))).toBeGreaterThan(0.5)
    expect(container.querySelector('tr[data-pair="1-3"]')!.getAttribute('data-closeness')).toBe('0.000')
  })

  it('follows the shared filters', async () => {
    const { container } = await openCategories()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Technical development' }))
    expect(container.querySelector('tr[data-category$=":Languages"]')).toBeNull()
    expect(container.querySelector('tr[data-category="interpersonal:Leadership"]')).toBeTruthy()
  })
})
