import type { GraphData, Role } from '../../shared/graph'

const term = (id: number, name: string, kind: 'value' | 'skill', section: string | null, category: string) => ({
  id,
  name,
  kind,
  section,
  category,
  definition: `${name} is a thing.`,
})
const link = (person: number, t: number, role: Role) => ({ person, term: t, role })

/**
 * Alex: React.  Bo: Vue (adjacent to React).  Cy: React and Vue.  Di: Mentoring (unrelated to the rest).
 * Alex and Di share the value Trust. Di wants Vue; Bo wants React; Alex wants Rust (which Bo has).
 */
export const FIXTURE: GraphData = {
  people: [
    { id: 1, name: 'Alex' },
    { id: 2, name: 'Bo' },
    { id: 3, name: 'Cy' },
    { id: 4, name: 'Di' },
  ],
  terms: [
    term(1, 'React', 'skill', 'technical', 'Web and frontend'),
    term(2, 'Vue', 'skill', 'technical', 'Web and frontend'),
    term(3, 'Rust', 'skill', 'technical', 'Languages'),
    term(4, 'Mentoring', 'skill', 'interpersonal', 'Leadership'),
    term(5, 'Trust', 'value', null, 'Relationships and community'),
  ],
  links: [
    link(1, 1, 'experience'),
    link(2, 2, 'experience'),
    link(3, 1, 'experience'),
    link(3, 2, 'experience'),
    link(4, 4, 'experience'),
    link(1, 5, 'value'),
    link(4, 5, 'value'),
    link(1, 3, 'desired'),
    link(2, 3, 'experience'),
    link(2, 1, 'desired'),
    link(4, 2, 'desired'),
  ],
  related: [{ a: 1, b: 2, score: 1, reasons: ['same category: Web and frontend', 'similar definitions'] }],
}
