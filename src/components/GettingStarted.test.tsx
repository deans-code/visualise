// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeApi } from '../test-utils'
import { GettingStarted, nextStep, stepStates } from './GettingStarted'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const person = (id: number) => ({ id, name: `p${id}`, termCount: 3 })
const term = (id: number) => ({ id, name: `t${id}` })

const api = (people: number, undef: number) =>
  makeApi({
    listIndividuals: vi.fn().mockResolvedValue(Array.from({ length: people }, (_, i) => person(i))),
    listTerms: vi.fn().mockResolvedValue(Array.from({ length: undef }, (_, i) => term(i))),
  })

const steps = async () => (await screen.findAllByRole('listitem')).map((li) => li.getAttribute('data-state'))

describe('step logic', () => {
  it('moves through upload, review and explore', () => {
    expect(stepStates({ people: 0, undefinedTerms: 0 })).toEqual(['current', 'waiting', 'waiting'])
    expect(stepStates({ people: 1, undefinedTerms: 0 })).toEqual(['current', 'waiting', 'waiting'])
    expect(stepStates({ people: 3, undefinedTerms: 2 })).toEqual(['done', 'current', 'available'])
    expect(stepStates({ people: 3, undefinedTerms: 0 })).toEqual(['done', 'done', 'current'])
    expect(nextStep({ people: 0, undefinedTerms: 0 }).page).toBe('people')
    expect(nextStep({ people: 3, undefinedTerms: 2 }).page).toBe('dictionary')
    expect(nextStep({ people: 3, undefinedTerms: 0 }).page).toBe('explore')
  })
})

describe('GettingStarted', () => {
  it('with nothing uploaded, makes upload current and offers People', async () => {
    const onGo = vi.fn()
    render(<GettingStarted api={api(0, 0)} page="explore" refreshKey={0} onGo={onGo} />)
    expect(await steps()).toEqual(['current', 'waiting', 'waiting'])
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Upload profiles')
    await userEvent.click(screen.getByRole('button', { name: /Go to People/ }))
    expect(onGo).toHaveBeenCalledWith('people')
  })

  it('offers Explore once two people exist and nothing is undefined', async () => {
    const onGo = vi.fn()
    render(<GettingStarted api={api(2, 0)} page="people" refreshKey={0} onGo={onGo} />)
    expect(await steps()).toEqual(['done', 'done', 'current'])
    await userEvent.click(screen.getByRole('button', { name: 'Go to Explore' }))
    expect(onGo).toHaveBeenCalledWith('explore')
  })

  it('points at the Dictionary while terms remain undefined, and says how many', async () => {
    render(<GettingStarted api={api(3, 2)} page="people" refreshKey={0} onGo={vi.fn()} />)
    expect(await steps()).toEqual(['done', 'current', 'available'])
    expect(screen.getByText(/2 terms have no definition yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dictionary/ })).toBeInTheDocument()
  })

  it('offers no button on the page it points to', async () => {
    render(<GettingStarted api={api(2, 0)} page="explore" refreshKey={0} onGo={vi.fn()} />)
    await steps()
    expect(screen.queryByRole('button', { name: /Go to/ })).toBeNull()
  })

  it('stays collapsed once collapsed, across a re-render', async () => {
    const { unmount } = render(<GettingStarted api={api(0, 0)} page="people" refreshKey={0} onGo={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Hide help' }))
    expect(screen.getByRole('button', { name: 'Show help' })).toHaveAttribute('aria-expanded', 'false')
    unmount()
    render(<GettingStarted api={api(0, 0)} page="explore" refreshKey={0} onGo={vi.fn()} />)
    expect(await screen.findByRole('button', { name: 'Show help' })).toBeInTheDocument()
  })

  it('refreshes when the data changes', async () => {
    const a = api(0, 0)
    const { rerender } = render(<GettingStarted api={a} page="people" refreshKey={0} onGo={vi.fn()} />)
    await steps()
    ;(a.listIndividuals as ReturnType<typeof vi.fn>).mockResolvedValue([person(1), person(2)])
    rerender(<GettingStarted api={a} page="people" refreshKey={1} onGo={vi.fn()} />)
    await vi.waitFor(async () => expect(await steps()).toEqual(['done', 'done', 'current']))
  })
})
