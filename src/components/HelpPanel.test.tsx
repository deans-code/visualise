// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HelpPanel } from './HelpPanel'

beforeEach(() => sessionStorage.clear())
afterEach(cleanup)

const panel = (id = 'p') => (
  <HelpPanel id={id} title="How to use X">
    <p>Do the thing.</p>
  </HelpPanel>
)

describe('HelpPanel', () => {
  it('starts expanded, with the content and the gesture hint', () => {
    render(panel())
    expect(screen.getByRole('complementary', { name: /how to use: how to use x/i })).toBeInTheDocument()
    expect(screen.getByText('Do the thing.')).toBeVisible()
    expect(screen.getByText(/right-click/i)).toBeVisible()
    expect(screen.getByText(/press and hold/i)).toBeVisible()
  })

  it('collapses and expands from the keyboard-reachable button', () => {
    render(panel())
    const toggle = screen.getByRole('button', { name: 'Hide help' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Show help' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Do the thing.')).not.toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Show help' }))
    expect(screen.getByText('Do the thing.')).toBeVisible()
  })

  it('stays collapsed when the page is left and returned to, and panels are independent', () => {
    const first = render(panel('a'))
    fireEvent.click(screen.getByRole('button', { name: 'Hide help' }))
    first.unmount()

    render(panel('a'))
    expect(screen.getByRole('button', { name: 'Show help' })).toBeInTheDocument()
    cleanup()
    render(panel('b'))
    expect(screen.getByRole('button', { name: 'Hide help' })).toBeInTheDocument()
  })

  it('still works when browser storage throws', () => {
    const real = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    try {
      render(panel())
      expect(screen.getByText('Do the thing.')).toBeVisible()
    } finally {
      Storage.prototype.getItem = real
    }
  })
})
