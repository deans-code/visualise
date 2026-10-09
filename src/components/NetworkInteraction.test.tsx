// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExplainProvider, LONG_PRESS_MS } from '../explain'
import { FIXTURE } from '../graph/fixture'
import { makeApi } from '../test-utils'
import { Explore } from './Explore'

beforeEach(() => sessionStorage.clear())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const open = async (api = makeApi({ graph: vi.fn().mockResolvedValue(FIXTURE) }), onGoToPeople?: () => void) => {
  const view = render(
    <ExplainProvider>
      <Explore api={api} onGoToPeople={onGoToPeople} />
    </ExplainProvider>,
  )
  await screen.findByTestId('network')
  return view
}

const node = (c: HTMLElement, id: number) => c.querySelector<SVGGElement>(`[data-person="${id}"]`)!
const at = (el: Element) => {
  const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(el.getAttribute('transform') ?? '')!
  return { x: Number(m[1]), y: Number(m[2]) }
}
const edge = (c: HTMLElement, a: number, b: number) =>
  c.querySelector<SVGLineElement>(`[data-edge="${a}-${b}"]`) ?? c.querySelector<SVGLineElement>(`[data-edge="${b}-${a}"]`)

const drag = (el: Element, dx: number, dy: number, pointer: Record<string, unknown> = {}) => {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100, button: 0, pointerId: 1, ...pointer })
  fireEvent.pointerMove(el, { clientX: 100 + dx, clientY: 100 + dy, pointerId: 1, ...pointer })
  fireEvent.pointerUp(el, { clientX: 100 + dx, clientY: 100 + dy, pointerId: 1, ...pointer })
}
const details = () => screen.getByRole('complementary', { name: 'Details' })

describe('dragging people in the network', () => {
  it('moves a node with the pointer and its connected edges follow', async () => {
    const { container } = await open()
    fireEvent.change(screen.getByLabelText(/hide weaker/i), { target: { value: '0.1' } })
    const alex = node(container, 1)
    const before = at(alex)
    const line = edge(container, 1, 3)!
    const lineEndBefore = [line.getAttribute('x1'), line.getAttribute('x2')]

    drag(alex, 30, 20)

    expect(at(alex)).toEqual({ x: before.x + 30, y: before.y + 20 })
    // Alex is "a" (x1/y1) or "b" (x2/y2) of the line; either way an end has moved to follow.
    const lineEndAfter = [line.getAttribute('x1'), line.getAttribute('x2')]
    expect(lineEndAfter).not.toEqual(lineEndBefore)
  })

  it('keeps a node where it was dropped and does not move the others', async () => {
    const { container } = await open()
    const bo = at(node(container, 2))
    drag(node(container, 1), 40, 0)
    expect(at(node(container, 2))).toEqual(bo)
    // Another press elsewhere leaves Alex put.
    const alex = at(node(container, 1))
    fireEvent.pointerDown(node(container, 3), { clientX: 5, clientY: 5, pointerId: 2 })
    expect(at(node(container, 1))).toEqual(alex)
  })

  it('treats a press that barely moves as a click and selects the person', async () => {
    const { container } = await open()
    const before = at(node(container, 1))
    drag(node(container, 1), 2, 1)
    fireEvent.click(node(container, 1))
    expect(at(node(container, 1))).toEqual(before)
    expect(within(details()).getByRole('heading', { name: 'Alex' })).toBeInTheDocument()
  })

  it('does not select when a drag ends, even though the browser sends a click', async () => {
    const { container } = await open()
    drag(node(container, 1), 30, 30)
    fireEvent.click(node(container, 1)) // the click the browser fires after pointer up
    expect(within(details()).getByText(/select a person or a connection/i)).toBeInTheDocument()

    // The next genuine click selects again.
    await new Promise((r) => setTimeout(r, 5))
    fireEvent.click(node(container, 1))
    expect(within(details()).getByRole('heading', { name: 'Alex' })).toBeInTheDocument()
  })

  it('keeps nodes inside the canvas', async () => {
    const { container } = await open()
    drag(node(container, 1), 100000, -100000)
    const { x, y } = at(node(container, 1))
    expect(x).toBeLessThanOrEqual(800)
    expect(y).toBeGreaterThanOrEqual(0)
    drag(node(container, 1), -200000, 200000)
    expect(at(node(container, 1)).x).toBeGreaterThanOrEqual(0)
    expect(at(node(container, 1)).y).toBeLessThanOrEqual(520)
  })

  it('ignores a right-button press', async () => {
    const { container } = await open()
    const before = at(node(container, 1))
    drag(node(container, 1), 50, 50, { button: 2 })
    expect(at(node(container, 1))).toEqual(before)
  })

  it('moves a focused node with the arrow keys, further with Shift', async () => {
    const { container } = await open()
    const alex = node(container, 1)
    const before = at(alex)
    fireEvent.keyDown(alex, { key: 'ArrowRight' })
    expect(at(alex)).toEqual({ x: before.x + 10, y: before.y })
    fireEvent.keyDown(alex, { key: 'ArrowDown', shiftKey: true })
    expect(at(alex)).toEqual({ x: before.x + 10, y: before.y + 40 })
    fireEvent.keyDown(alex, { key: 'ArrowLeft' })
    fireEvent.keyDown(alex, { key: 'ArrowUp' })
    fireEvent.keyDown(alex, { key: 'ArrowUp', shiftKey: true })
    fireEvent.keyDown(alex, { key: 'ArrowUp', shiftKey: true })
    expect(at(alex).x).toBe(before.x)
    // Enter still selects.
    fireEvent.keyDown(alex, { key: 'Enter' })
    expect(within(details()).getByRole('heading', { name: 'Alex' })).toBeInTheDocument()
  })

  it('resets the layout, and Reset is disabled until something has moved', async () => {
    const { container } = await open()
    const reset = screen.getByRole('button', { name: 'Reset layout' })
    expect(reset).toBeDisabled()
    const before = at(node(container, 1))
    drag(node(container, 1), 60, 60)
    expect(reset).toBeEnabled()
    await userEvent.click(reset)
    expect(at(node(container, 1))).toEqual(before)
    expect(reset).toBeDisabled()
  })

  it('starts afresh when the filters change the layout', async () => {
    const { container } = await open()
    const before = at(node(container, 1))
    drag(node(container, 1), 60, 60)
    expect(at(node(container, 1))).not.toEqual(before)
    await userEvent.click(screen.getByRole('radio', { name: 'Shared values' }))
    expect(screen.getByRole('button', { name: 'Reset layout' })).toBeDisabled()
  })

  it('offers no dragging in the other views', async () => {
    const { container } = await open()
    await userEvent.click(screen.getByRole('button', { name: 'Matrix' }))
    expect(container.querySelector('.node')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset layout' })).toBeNull()
  })
})

describe('dragging and the touch long-press', () => {
  const touch = { pointerType: 'touch' }

  it('a hold without movement opens the explanation and does not drag', async () => {
    const { container } = await open()
    vi.useFakeTimers()
    const before = at(node(container, 1))
    fireEvent.pointerDown(node(container, 1), { ...touch, clientX: 10, clientY: 10, pointerId: 3 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Alex')
    fireEvent.pointerUp(node(container, 1), { ...touch, pointerId: 3 })
    expect(at(node(container, 1))).toEqual(before)
  })

  it('moving cancels the long-press and drags instead', async () => {
    const { container } = await open()
    vi.useFakeTimers()
    const before = at(node(container, 1))
    fireEvent.pointerDown(node(container, 1), { ...touch, clientX: 10, clientY: 10, pointerId: 3 })
    fireEvent.pointerMove(node(container, 1), { ...touch, clientX: 40, clientY: 10, pointerId: 3 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.pointerUp(node(container, 1), { ...touch, pointerId: 3 })
    expect(at(node(container, 1))).toEqual({ x: before.x + 30, y: before.y })
  })

  it('stops the page scrolling while a node is dragged (touch-action on nodes)', () => {
    const css = readFileSync('src/styles.css', 'utf-8')
    expect(css).toMatch(/\.node\s*\{[^}]*touch-action:\s*none/)
  })
})

describe('right-click explanations in Explore', () => {
  it('explains a person, a connection and a legend entry', async () => {
    const { container } = await open()
    fireEvent.change(screen.getByLabelText(/hide weaker/i), { target: { value: '0.1' } })

    fireEvent.contextMenu(node(container, 4))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Di')
    expect(screen.getByRole('dialog')).toHaveTextContent(/not connected to anyone/i)
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.contextMenu(edge(container, 1, 3)!.parentElement!)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Alex and Cy')
    expect(screen.getByRole('dialog')).toHaveTextContent(/% similar/)
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.contextMenu(within(screen.getByRole('list', { name: 'Groups' })).getByText(/Not connected/))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Not connected')
  })

  it('does not select when a node is right-clicked', async () => {
    const { container } = await open()
    fireEvent.contextMenu(node(container, 1))
    expect(within(details()).getByText(/select a person or a connection/i)).toBeInTheDocument()
  })

  it('explains the filter controls and the view switcher', async () => {
    await open()
    fireEvent.contextMenu(screen.getByLabelText(/related terms count/i))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Related terms count')
    expect(screen.getByRole('dialog')).toHaveTextContent(/exact only/i)
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.contextMenu(screen.getByRole('radio', { name: 'Could help' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Could help')
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Matrix' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Matrix view')
  })

  it('explains matrix cells, terms in the matrix, and the matrix legend', async () => {
    const { container } = await open()
    await userEvent.click(screen.getByRole('button', { name: 'Matrix' }))
    const cell = container.querySelector('td[data-person="1"][data-has="true"]')!
    fireEvent.contextMenu(cell)
    expect(screen.getByRole('dialog')).toHaveTextContent(/Alex has chosen/)
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.contextMenu(screen.getByRole('rowheader', { name: 'React' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('React')
    expect(screen.getByRole('dialog')).toHaveTextContent('React is a thing.')
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.contextMenu(screen.getByText(/has it · ≈/))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Reading the matrix')
  })

  it('explains people and terms in the people-and-terms view, and categories', async () => {
    const { container } = await open()
    await userEvent.click(screen.getByRole('button', { name: 'People and terms' }))
    fireEvent.contextMenu(container.querySelector('[data-person="1"]')!)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Alex')
    fireEvent.keyDown(document, { key: 'Escape' })

    await userEvent.click(screen.getByRole('button', { name: 'By category' }))
    fireEvent.contextMenu(container.querySelector('tr[data-category] td[data-person="1"]')!)
    expect(screen.getByRole('dialog')).toHaveTextContent(/Alex has/)
  })

  it('shows a definition for a term in the details panel and says so when there is none', async () => {
    const { container } = await open()
    fireEvent.click(node(container, 1))
    fireEvent.contextMenu(within(details()).getAllByText('React')[0])
    expect(screen.getByRole('dialog')).toHaveTextContent('React is a thing.')
  })
})

describe('usage guidance in Explore', () => {
  it('shows a help panel with the gestures and describes each view as it is selected', async () => {
    await open()
    expect(screen.getByRole('complementary', { name: /how to use: how to use explore/i })).toBeInTheDocument()
    const guide = screen.getByTestId('view-guide')
    expect(guide).toHaveTextContent(/drag people to rearrange them/i)
    expect(guide).toHaveTextContent(/each shape is a person/i)

    await userEvent.click(screen.getByRole('button', { name: 'Matrix' }))
    expect(screen.getByTestId('view-guide')).toHaveTextContent(/rows are terms, columns are people/i)
    await userEvent.click(screen.getByRole('button', { name: 'People and terms' }))
    expect(screen.getByTestId('view-guide')).toHaveTextContent(/people on the left/i)
    await userEvent.click(screen.getByRole('button', { name: 'By category' }))
    expect(screen.getByTestId('view-guide')).toHaveTextContent(/catalogue/i)
  })

  it('describes the key filters beside them', async () => {
    await open()
    expect(screen.getByText(/how far a related term counts as a match/i)).toBeInTheDocument()
    expect(screen.getByText(/drop lines weaker than this/i)).toBeInTheDocument()
  })

  it('tells a user with no profiles what to do next and offers a way to People', async () => {
    const onGoToPeople = vi.fn()
    render(
      <ExplainProvider>
        <Explore api={makeApi()} onGoToPeople={onGoToPeople} />
      </ExplainProvider>,
    )
    expect(await screen.findByText(/upload some profiles on the people tab/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go to People' }))
    expect(onGoToPeople).toHaveBeenCalled()
  })

  it('tells the user what to try when loading fails', async () => {
    render(
      <ExplainProvider>
        <Explore api={makeApi({ graph: vi.fn().mockRejectedValue(new Error('boom')) })} />
      </ExplainProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/boom.*server is running/i)
  })
})
