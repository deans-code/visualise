import { normaliseTerm } from './normalise'
import { SECTIONS, type Section } from './profile'

export interface CatalogueTerm {
  name: string
  kind: 'value' | 'skill'
  section: Section | null
  category: string
  definition: string | null
}

export interface Catalogue {
  version: number
  terms: CatalogueTerm[]
}

/** The shape of the profile app's `src/data` exports that the importer needs. */
export interface ProfileData {
  VALUE_CATEGORIES: { category: string; values: string[] }[]
  CATALOGS: Record<Section, { category: string; skills: string[] }[]>
  VALUE_DEFINITIONS: Record<string, string>
  SKILL_DEFINITIONS: Record<Section, Record<string, string>>
}

const lookup = (defs: Record<string, string>) => {
  const m = new Map<string, string>()
  for (const [k, v] of Object.entries(defs)) m.set(normaliseTerm(k), v)
  return (name: string) => m.get(normaliseTerm(name)) ?? null
}

/** Flatten the profile app's catalogue into one list of terms with category, section and definition. */
export function buildCatalogue(data: ProfileData): Catalogue {
  const terms: CatalogueTerm[] = []
  const seen = new Set<string>()
  const add = (t: CatalogueTerm) => {
    const key = `${t.kind}:${normaliseTerm(t.name)}`
    if (seen.has(key)) return // first listing wins when a name appears in two categories
    seen.add(key)
    terms.push(t)
  }

  const valueDef = lookup(data.VALUE_DEFINITIONS)
  for (const c of data.VALUE_CATEGORIES) {
    for (const name of c.values) {
      add({ name, kind: 'value', section: null, category: c.category, definition: valueDef(name) })
    }
  }
  for (const section of SECTIONS) {
    const def = lookup(data.SKILL_DEFINITIONS[section])
    for (const c of data.CATALOGS[section]) {
      for (const name of c.skills) {
        add({ name, kind: 'skill', section, category: c.category, definition: def(name) })
      }
    }
  }
  return { version: 1, terms }
}
