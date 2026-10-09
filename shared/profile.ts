export const SECTIONS = ['technical', 'engineering', 'interpersonal', 'ai'] as const
export type Section = (typeof SECTIONS)[number]

export const SECTION_LABELS: Record<Section, string> = {
  technical: 'Technical development',
  engineering: 'Engineering',
  interpersonal: 'Interpersonal',
  ai: 'AI engineering',
}

export interface SectionSkills {
  experience: string[]
  desired: string[]
}

export interface Profile {
  values: string[]
  skills: Record<Section, SectionSkills>
}

export type ParseResult = { ok: true; profile: Profile } | { ok: false; error: string }

function stringList(v: unknown, path: string): string[] | string {
  if (!Array.isArray(v)) return `${path} must be an array`
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== 'string') return `${path} must contain only strings`
    const t = item.trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

/** Validate an already-parsed JSON value against the profile tool's export shape. */
export function validateProfile(data: unknown): ParseResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Profile must be a JSON object' }
  }
  const obj = data as Record<string, unknown>

  const values = stringList(obj.values, 'values')
  if (typeof values === 'string') return { ok: false, error: values }

  const skillsRaw = obj.skills
  if (typeof skillsRaw !== 'object' || skillsRaw === null || Array.isArray(skillsRaw)) {
    return { ok: false, error: 'skills must be an object' }
  }

  const skills = {} as Record<Section, SectionSkills>
  for (const section of SECTIONS) {
    const raw = (skillsRaw as Record<string, unknown>)[section]
    if (raw === undefined) {
      skills[section] = { experience: [], desired: [] }
      continue
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { ok: false, error: `skills.${section} must be an object` }
    }
    const r = raw as Record<string, unknown>
    const experience = stringList(r.experience, `skills.${section}.experience`)
    if (typeof experience === 'string') return { ok: false, error: experience }
    const desired = stringList(r.desired, `skills.${section}.desired`)
    if (typeof desired === 'string') return { ok: false, error: desired }
    skills[section] = { experience, desired }
  }

  return { ok: true, profile: { values, skills } }
}

/** Parse and validate profile JSON text. */
export function parseProfile(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${(e as Error).message}` }
  }
  return validateProfile(data)
}
