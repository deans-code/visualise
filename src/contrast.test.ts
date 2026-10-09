import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles.css', 'utf-8')

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The body of the rule that opens with `selector`, closed by a brace at the same indentation. */
const block = (selector: string) => {
  const start = css.indexOf(selector)
  expect(start, selector).toBeGreaterThanOrEqual(0)
  const indent = /^ */.exec(selector)![0]
  const end = css.indexOf(`
${indent}}`, start)
  return css.slice(css.indexOf('{', start) + 1, end)
}
const vars = (text: string) => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))

const light = vars(block(':root {'))
const darkOverrides = vars(block(":root[data-theme='dark'] {"))
const darkMediaOverrides = vars(block("  :root:where(:not([data-theme='light'])) {"))
// Dark mode only restates what changes; everything else cascades from :root.
const dark = { ...light, ...darkOverrides }

describe.each([
  ['light', light],
  ['dark', dark],
])('matrix cell contrast (%s)', (_mode, v) => {
  it.each([0, 1, 2, 3, 4, 5])('level %i ink is readable on its background', (n) => {
    expect(v[`seq-${n}`], `seq-${n}`).toBeTruthy()
    expect(v[`seq-ink-${n}`], `seq-ink-${n}`).toBeTruthy()
    expect(contrast(v[`seq-ink-${n}`], v[`seq-${n}`])).toBeGreaterThanOrEqual(4.5)
  })

  it('group colours and edges stay visible against the surface (3:1 for graphical marks)', () => {
    // Light-mode aqua (group 3) is the known exception: 2.74:1, which is why every node carries a name label,
    // a distinct shape, and the connections are also available as a table.
    const allowedBelow3 = _mode === 'light' ? ['group-3'] : []
    for (const k of ['group-1', 'group-2', 'group-3', 'group-other', 'edge']) {
      const c = contrast(v[k], v['surface-1'])
      if (allowedBelow3.includes(k)) expect(c).toBeGreaterThan(2.5)
      else expect(c, k).toBeGreaterThanOrEqual(3)
    }
  })

  it('text tokens are readable on the surface', () => {
    expect(contrast(v['text-primary'], v['surface-1'])).toBeGreaterThanOrEqual(7)
    expect(contrast(v['text-secondary'], v['surface-1'])).toBeGreaterThanOrEqual(4.5)
  })
})

describe('dark theme', () => {
  it('is declared identically for the OS setting and the manual toggle', () => {
    expect(darkMediaOverrides).toEqual(darkOverrides)
  })
})
