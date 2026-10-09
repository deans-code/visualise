export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'profile-visualiser.theme'

/** Browser storage can be missing or throw (private windows, blocked site data), so the page works without it. */
export function loadTheme(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function saveTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, choice)
  } catch {
    // Not remembered, but still applied for this visit.
  }
}

/** "system" removes the override so the operating system's setting applies. */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}
