import { describe, expect, it } from 'vitest'
import { normaliseTerm } from './normalise'

describe('normaliseTerm', () => {
  it.each([
    ['TypeScript', 'typescript'],
    ['  Web   accessibility ', 'web accessibility'],
    ['Spec-driven development', 'spec driven development'],
    ['"React",', 'react'],
    ['(Docker)', 'docker'],
  ])('%s -> %s', (input, expected) => expect(normaliseTerm(input)).toBe(expected))

  it('keeps meaningful symbols', () => {
    expect(normaliseTerm('C#')).toBe('c#')
    expect(normaliseTerm('C++')).toBe('c++')
    expect(normaliseTerm('.NET')).toBe('.net')
    expect(normaliseTerm('Node.js')).toBe('node.js')
  })
})
