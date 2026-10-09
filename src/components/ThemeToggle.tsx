import { useEffect, useState } from 'react'
import { applyTheme, loadTheme, saveTheme, type ThemeChoice } from '../theme'

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(loadTheme)

  useEffect(() => {
    applyTheme(choice)
    saveTheme(choice)
  }, [choice])

  return (
    <label>
      Theme{' '}
      <select value={choice} onChange={(e) => setChoice(e.target.value as ThemeChoice)}>
        <option value="system">Match system</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  )
}
