// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './components/ThemeToggle'
import { applyTheme, loadTheme, saveTheme } from './theme'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('theme', () => {
  it('applies and clears the override on the root element', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('remembers the choice between visits', () => {
    saveTheme('light')
    expect(loadTheme()).toBe('light')
    saveTheme('system')
    expect(loadTheme()).toBe('system')
  })

  it('ignores junk in storage', () => {
    window.localStorage.setItem('profile-visualiser.theme', 'neon')
    expect(loadTheme()).toBe('system')
  })

  it('still works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadTheme()).toBe('system')
    expect(() => saveTheme('dark')).not.toThrow()
  })

  it('the toggle switches the theme and stores it', async () => {
    render(<ThemeToggle />)
    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(loadTheme()).toBe('dark')
  })
})
