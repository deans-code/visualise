import type { Filters } from '../shared/graph'
import { SECTION_LABELS, type Section } from '../shared/profile'
import type { Explanation } from './explain'

export type ViewId = 'network' | 'matrix' | 'bipartite' | 'categories'
export type BasisId = Filters['basis']

const pct = (n: number) => `${Math.round(n * 100)}%`
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const sectionLabel = (section: string | null | undefined) =>
  section ? (SECTION_LABELS[section as Section] ?? section) : 'Values'

/** The profile section a term belongs to, as the data-section accent key. Custom terms may have none. */
export const accentOf = (t: { kind: string; section: string | null }): string | undefined =>
  t.kind === 'value' ? 'values' : (t.section ?? undefined)

// ---- Usage guidance: what each view plots and how to read it -----------------------------------------------

export const VIEW_GUIDE: Record<ViewId, { label: string; summary: string; howToRead: string }> = {
  network: {
    label: 'Network',
    summary: 'Each shape is a person. A line joins two people who share, or have related, terms.',
    howToRead:
      'Thicker, darker lines mean a stronger overlap. Colour and shape together show which group a person falls in. Dashed arrows (in Could help) point from someone with a skill to someone who wants it. Click a person or a line to see why in the panel on the right. Drag people to rearrange them, then use Reset layout to put them back.',
  },
  matrix: {
    label: 'Matrix',
    summary: 'Rows are terms, columns are people.',
    howToRead:
      'A dot means the person has the term. A ≈ means they have a closely related one; the darker the cell, the closer. W marks a skill someone wants to learn. Rows are grouped by section and category.',
  },
  bipartite: {
    label: 'People and terms',
    summary: 'People on the left, terms on the right, a line wherever a person has a term.',
    howToRead:
      'Terms with many lines are what the group has in common; a term with one line is a niche strength. Click a person or a term to highlight its lines.',
  },
  categories: {
    label: 'By category',
    summary: "Compares people by the catalogue's categories rather than by exact terms.",
    howToRead:
      'Numbers are how many of a person’s terms fall in each category, and darker means a bigger share of their own profile. Two people who chose different languages still both show weight in “Languages”. The table underneath ranks who is closest overall.',
  },
}

/** A line under each Explore filter saying what it does, visible without opening anything. */
export const FILTER_HINTS = {
  basis: 'Decides what a connection means: what people share, what they want to learn, or who could help whom.',
  sections: 'Only skills in the ticked areas count. Values are not skills, so this is not used for shared values.',
  adjacency: 'How far a related term counts as a match.',
  threshold: 'Drop lines weaker than this.',
  focus: 'Keep only connections that involve a term you pick, such as everyone who shares it.',
}

/** Things to try in Explore: which control to change, to what, and what to expect. */
export const TRY_THIS: { control: string; action: string; effect: string }[] = [
  {
    control: 'Connect people by',
    action: 'Choose Could help.',
    effect: 'Arrows appear from someone who has a skill to someone who wants to learn it, so you can see who could mentor whom.',
  },
  {
    control: 'Related terms count',
    action: 'Slide it from exact only up to about 50%.',
    effect: 'People who chose related terms, such as React and Vue, are drawn closer, with a weaker line than an identical match.',
  },
  {
    control: 'Hide weaker connections',
    action: 'Raise it to 50% or more.',
    effect: 'Only the strongest relationships remain, which makes the groups easier to see. Lower it again to see everything.',
  },
  {
    control: 'Focus on a term',
    action: 'Type a skill or value someone has chosen and pick it from the list.',
    effect: 'Only connections that involve that term remain, so you can see who shares it.',
  },
]

// ---- Explanations: views, controls, status, legends ---------------------------------------------------------

export const viewExplanation = (v: ViewId): Explanation => ({
  title: `${VIEW_GUIDE[v].label} view`,
  kicker: 'Explore view',
  body: VIEW_GUIDE[v].summary,
  details: [VIEW_GUIDE[v].howToRead],
})

const BASIS: Record<BasisId, { label: string; body: string }> = {
  values: { label: 'Shared values', body: 'Connects people who chose the same or similar values.' },
  experience: { label: 'Experience', body: 'Connects people who already have the same or similar skills.' },
  desired: { label: 'Wants to learn', body: 'Connects people who want to develop the same or similar skills.' },
  complementary: {
    label: 'Could help',
    body: 'Draws an arrow from someone who has a skill to someone who wants to learn it, so you can see who could mentor whom.',
  },
}

export const basisExplanation = (b: BasisId): Explanation => ({
  title: BASIS[b].label,
  kicker: 'Connect people by',
  body: BASIS[b].body,
})

export const basisGroupExplanation: Explanation = {
  title: 'Connect people by',
  kicker: 'Filter',
  body: 'Chooses what a connection means: shared values, existing experience, skills people want to learn, or who could help whom.',
  details: Object.values(BASIS).map((b) => `${b.label}: ${b.body}`),
}

export const sectionsExplanation: Explanation = {
  title: 'Skill areas',
  kicker: 'Filter',
  body: 'Limits skills to the sections ticked: technical, engineering, interpersonal and AI engineering. Values are not skills, so this has no effect on the shared values basis.',
}

export const adjacencyExplanation: Explanation = {
  title: 'Related terms count',
  kicker: 'Filter',
  body: 'How much a related term counts compared with an identical one. At exact only, React and Vue are different; slide up and people who chose either are drawn closer, with a weaker line than an exact match.',
  details: ['Exact only: only identical terms connect people.', '100%: a related term counts as much as an identical one.'],
}

export const thresholdExplanation: Explanation = {
  title: 'Hide weaker connections',
  kicker: 'Filter',
  body: 'Hides lines weaker than the percentage shown, so the picture shows only the strongest relationships. Lower it to see everything.',
}

export const focusExplanation: Explanation = {
  title: 'Focus on a term',
  kicker: 'Filter',
  body: 'Keeps only connections that involve the terms you pick, such as everyone who shares “Kubernetes”. Remove a term with its × button.',
}

export const switcherExplanation: Explanation = {
  title: 'Views',
  kicker: 'Explore',
  body: 'The same people and filters shown four ways: network, matrix, people and terms, and by category. Pick the one that answers your question.',
}

export const statusExplanation = {
  custom: {
    title: 'Custom term',
    kicker: 'Dictionary status',
    body: 'Not in the built-in catalogue; it came from an uploaded profile. Its definition was confirmed by whoever uploaded it, or it is still undefined.',
  },
  undefined: {
    title: 'Undefined term',
    kicker: 'Dictionary status',
    body: 'Has no confirmed definition yet. Edit it here to add one, so the explanation can be shown everywhere.',
  },
  builtin: {
    title: 'Built-in term',
    kicker: 'Dictionary status',
    body: 'Comes from the shipped catalogue with its own definition and category.',
  },
} satisfies Record<string, Explanation>

// ---- Terms and people ---------------------------------------------------------------------------------------

export interface TermLike {
  name: string
  kind: string
  section: string | null
  category: string | null
  definition: string | null
}

export const termExplanation = (t: TermLike): Explanation => ({
  title: t.name,
  kicker: [t.kind === 'value' ? 'Value' : `Skill · ${sectionLabel(t.section)}`, t.category].filter(Boolean).join(' · '),
  body: t.definition ?? 'No definition is available for this term yet. Add one from the Dictionary tab, or through term review after an upload.',
})

export const personListExplanation = (name: string, termCount: number): Explanation => ({
  title: name,
  kicker: 'Person',
  body: `One uploaded profile, shown under the name of its file. They chose ${plural(termCount, 'term')} across values and skills, both what they have and what they want to learn.`,
})

export const nodeExplanation = (name: string, group: string | null, connections: number): Explanation => ({
  title: name,
  kicker: 'Person in the network',
  body: group
    ? `${group}: people in the same group are drawn with the same colour and shape and are more strongly connected to each other than to the rest.`
    : 'Not connected to anyone under the current filters, so they sit apart. Lower the threshold or raise the related terms slider to see weaker links.',
  details: [`${plural(connections, 'connection')} shown`, 'Click to see what links them. Drag, or use the arrow keys, to move them.'],
})

export const edgeExplanation = (a: string, b: string, similarity: number): Explanation => ({
  title: `${a} and ${b}`,
  kicker: 'Connection',
  body: `A line means these two people share, or have closely related, terms. They are ${pct(similarity)} similar under the current filters; the thicker and darker the line, the stronger the overlap.`,
  details: ['Click the line to list the shared and related terms.'],
})

export const helpEdgeExplanation = (from: string, to: string, skills: number): Explanation => ({
  title: `${from} could help ${to}`,
  kicker: 'Arrow',
  body: `${from} has ${plural(skills, 'skill')} that ${to} wants to learn. The arrow points from the person with the skill to the person who wants it.`,
})

/** What groups are, why they exist and how to look at them, shown beside the network legend. */
export const GROUPS_GUIDE = {
  title: 'About groups',
  withGroups: [
    'Groups show who clusters together: people connected more strongly to each other than to the rest. They are found automatically from the lines currently drawn, so they can change when you change a filter.',
    'Each group has its own colour and shape, so you can tell them apart without relying on colour. People with no connection under the filters are not in a group.',
    'To look at one group, click its entry below to highlight its people and the lines between them (click it again to clear). Or open “Show connections as a table”, which has a Group column.',
  ],
  noGroups: [
    'There are no groups yet: a group needs at least one connection between people.',
    'Lower “Hide weaker connections”, or raise “Related terms count”, to bring connections back. Groups are found automatically from the lines drawn, so they appear as soon as there are some.',
  ],
}

export const groupExplanation = (label: string, members: string[]): Explanation => ({
  title: label,
  kicker: 'Group',
  body: 'A set of people who are connected more strongly to each other than to the rest. Each group has its own colour and shape, so it can be told apart without relying on colour.',
  details: [members.join(', ')],
})

export const ungroupedExplanation = (count: number): Explanation => ({
  title: 'Not connected',
  kicker: 'Group',
  body: `${plural(count, 'person', 'people')} with no connection under the current filters. Hiding weaker connections or turning related terms down can cause this.`,
})

// ---- Matrix, bipartite and category items -------------------------------------------------------------------

export const matrixCellExplanation = (
  person: string,
  term: string,
  state: { has: boolean; related: number; via: string | null; wants: boolean },
): Explanation => ({
  title: `${person} · ${term}`,
  kicker: 'Matrix cell',
  body: state.has
    ? `${person} has chosen ${term} (shown as a dot).`
    : state.related > 0
      ? `${person} has not chosen ${term}, but has the related ${state.via} (${pct(state.related)} close), shown as ≈. The darker the cell, the closer the match.`
      : `${person} has not chosen ${term}, and nothing they chose is closely related.`,
  details: state.wants ? [`${person} also wants to learn ${term} (marked W).`] : undefined,
})

export const matrixLegendExplanation = (complementary: boolean): Explanation => ({
  title: 'Reading the matrix',
  kicker: 'Legend',
  body: 'A dot means the person has the term. A ≈ means they have a related term, and darker cells are closer matches.',
  details: complementary ? ['W marks a skill the person wants to learn.'] : undefined,
})

export const bipartitePersonExplanation = (name: string, terms: number): Explanation => ({
  title: name,
  kicker: 'Person (circle)',
  body: `Has ${plural(terms, 'term')} under the current filters. Click to highlight only their lines.`,
})

export const bipartiteTermExplanation = (t: TermLike, people: number): Explanation => ({
  ...termExplanation(t),
  details: [`${plural(people, 'person', 'people')} ${people === 1 ? 'has' : 'have'} it (square). Click to highlight them.`],
})

export const categoryCellExplanation = (person: string, category: string, count: number): Explanation => ({
  title: `${person} · ${category}`,
  kicker: 'Category cell',
  body: `${person} has ${plural(count, 'term')} in ${category}. Darker means a bigger share of their own profile falls here, so people with different choices in the same category still look alike.`,
})

export const categoryLegendExplanation: Explanation = {
  title: 'Reading the categories',
  kicker: 'Legend',
  body: 'Numbers are how many of a person’s terms fall in each catalogue category. “People” counts who has anything there.',
}
