import { describe, expect, it } from 'vitest'
import { parseProfile } from './profile'

const valid = {
  values: ['Integrity', 'Trust'],
  skills: {
    technical: { experience: ['React'], desired: ['Rust'] },
    engineering: { experience: [], desired: [] },
    interpersonal: { experience: ['Mentoring'], desired: [] },
    ai: { experience: [], desired: ['Claude Code'] },
  },
}

describe('parseProfile', () => {
  it('accepts a valid profile', () => {
    const r = parseProfile(JSON.stringify(valid))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.profile.values).toEqual(['Integrity', 'Trust'])
      expect(r.profile.skills.technical.desired).toEqual(['Rust'])
    }
  })

  it('treats omitted sections as empty', () => {
    const r = parseProfile(JSON.stringify({ values: [], skills: { technical: { experience: ['Go'], desired: [] } } }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.profile.skills.ai).toEqual({ experience: [], desired: [] })
  })

  it('trims and de-duplicates entries', () => {
    const r = parseProfile(JSON.stringify({ ...valid, values: [' Trust ', 'Trust', ''] }))
    expect(r.ok && r.profile.values).toEqual(['Trust'])
  })

  it('rejects missing skills', () => {
    const r = parseProfile(JSON.stringify({ values: [] }))
    expect(r).toEqual({ ok: false, error: 'skills must be an object' })
  })

  it('rejects skills that is not an object', () => {
    expect(parseProfile(JSON.stringify({ values: [], skills: [] })).ok).toBe(false)
  })

  it('rejects wrong types', () => {
    const r = parseProfile(JSON.stringify({ ...valid, values: ['ok', 5] }))
    expect(r).toEqual({ ok: false, error: 'values must contain only strings' })
    const r2 = parseProfile(JSON.stringify({ values: [], skills: { ai: { experience: 'x', desired: [] } } }))
    expect(r2).toEqual({ ok: false, error: 'skills.ai.experience must be an array' })
  })

  it('rejects non-JSON', () => {
    const r = parseProfile('not json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Not valid JSON/)
  })

  it('rejects non-object top level', () => {
    expect(parseProfile('[]').ok).toBe(false)
    expect(parseProfile('null').ok).toBe(false)
  })
})
