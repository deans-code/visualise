// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLICK_SUPPRESS_MS, ExplainProvider, LONG_PRESS_MS, useExplain } from './explain'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Fixture({ onClick = () => {} }: { onClick?: () => void }) {
  const explain = useExplain()
  return (
    <div>
      <button onClick={onClick} {...explain.props({ title: 'React', kicker: 'Skill', body: 'A UI library.', details: ['More'] })}>
        React
      </button>
      <button>Plain</button>
      <input aria-label="Notes" {...explain.props({ title: 'Notes', body: 'Typing here.' })} />
    </div>
  )
}

const setup = (onClick?: () => void) => render(<ExplainProvider><Fixture onClick={onClick} /></ExplainProvider>)
const dialog = () => screen.queryByRole('dialog')

describe('explanations', () => {
  it('opens on right-click, suppressing the browser menu, and shows the content', () => {
    setup()
    const notPrevented = fireEvent.contextMenu(screen.getByRole('button', { name: 'React' }))
    expect(notPrevented).toBe(false)
    expect(dialog()).toHaveAccessibleName('React')
    expect(dialog()).toHaveTextContent('A UI library.')
    expect(dialog()).toHaveTextContent('More')
  })

  it('leaves the browser menu alone on elements with no explanation', () => {
    setup()
    expect(fireEvent.contextMenu(screen.getByRole('button', { name: 'Plain' }))).toBe(true)
    expect(dialog()).toBeNull()
  })

  it('opens from the keyboard with ?, Shift+F10 and the ContextMenu key, and a plain click only clicks', () => {
    const onClick = vi.fn()
    setup(onClick)
    const button = screen.getByRole('button', { name: 'React' })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(dialog()).toBeNull()

    for (const key of [{ key: '?' }, { key: 'F10', shiftKey: true }, { key: 'ContextMenu' }]) {
      fireEvent.keyDown(button, key)
      expect(dialog(), JSON.stringify(key)).not.toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(dialog()).toBeNull()
    }
  })

  it('does not open when ? is typed into a text box', () => {
    setup()
    fireEvent.keyDown(screen.getByLabelText('Notes'), { key: '?' })
    expect(dialog()).toBeNull()
  })

  it('closes with Escape and returns focus to the element', () => {
    setup()
    const button = screen.getByRole('button', { name: 'React' })
    button.focus()
    fireEvent.keyDown(button, { key: '?' })
    expect(dialog()).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dialog()).toBeNull()
    expect(button).toHaveFocus()
  })

  it('closes when the user presses elsewhere', () => {
    setup()
    fireEvent.contextMenu(screen.getByRole('button', { name: 'React' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Plain' }))
    expect(dialog()).toBeNull()
  })

  describe('touch long-press', () => {
    const touch = { pointerType: 'touch' }

    it('opens after the hold and swallows the click that follows', () => {
      vi.useFakeTimers()
      const onClick = vi.fn()
      setup(onClick)
      const button = screen.getByRole('button', { name: 'React' })

      fireEvent.pointerDown(button, touch)
      act(() => void vi.advanceTimersByTime(LONG_PRESS_MS - 1))
      expect(dialog()).toBeNull()
      act(() => void vi.advanceTimersByTime(1))
      expect(dialog()).not.toBeNull()

      fireEvent.pointerUp(button, touch)
      fireEvent.click(button)
      expect(onClick).not.toHaveBeenCalled()

      // A later, unrelated click is not swallowed.
      act(() => void vi.advanceTimersByTime(CLICK_SUPPRESS_MS + 1))
      fireEvent.click(button)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does nothing for a short tap or for a mouse press', () => {
      vi.useFakeTimers()
      const onClick = vi.fn()
      setup(onClick)
      const button = screen.getByRole('button', { name: 'React' })

      fireEvent.pointerDown(button, touch)
      act(() => void vi.advanceTimersByTime(LONG_PRESS_MS - 100))
      fireEvent.pointerUp(button, touch)
      act(() => void vi.advanceTimersByTime(1000))
      fireEvent.click(button)
      expect(dialog()).toBeNull()
      expect(onClick).toHaveBeenCalledTimes(1)

      fireEvent.pointerDown(button, { pointerType: 'mouse' })
      act(() => void vi.advanceTimersByTime(2000))
      expect(dialog()).toBeNull()
    })
  })
})
