import { useId, useState } from 'react'
import type { Basis, Filters, GraphIndex } from '../../shared/graph'
import { SECTIONS, SECTION_LABELS, type Section } from '../../shared/profile'
import {
  adjacencyExplanation,
  basisExplanation,
  basisGroupExplanation,
  FILTER_HINTS,
  focusExplanation,
  sectionsExplanation,
  thresholdExplanation,
} from '../explanations'
import { useExplain } from '../explain'

const BASES: { value: Basis; label: string; hint: string }[] = [
  { value: 'values', label: 'Shared values', hint: 'People who chose the same or similar values' },
  { value: 'experience', label: 'Experience', hint: 'People who have the same or similar skills' },
  { value: 'desired', label: 'Wants to learn', hint: 'People who want to develop the same or similar skills' },
  { value: 'complementary', label: 'Could help', hint: 'Arrows from someone with a skill to someone who wants it' },
]

export function FilterBar({
  index,
  filters,
  onChange,
}: {
  index: GraphIndex
  filters: Filters
  onChange: (f: Filters) => void
}) {
  const id = useId()
  const explain = useExplain()
  const [query, setQuery] = useState('')
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const valuesBasis = filters.basis === 'values'

  const toggleSection = (s: Section) =>
    set({ sections: filters.sections.includes(s) ? filters.sections.filter((x) => x !== s) : [...filters.sections, s] })

  const addFocus = (text: string) => {
    const match = index.data.terms.find((t) => t.name.toLowerCase() === text.trim().toLowerCase())
    if (match && !filters.focus.includes(match.id)) {
      set({ focus: [...filters.focus, match.id] })
      setQuery('')
    } else {
      setQuery(text)
    }
  }

  return (
    <form className="filters" aria-label="Filters" onSubmit={(e) => e.preventDefault()}>
      <fieldset {...explain.props(basisGroupExplanation)}>
        <legend>Connect people by</legend>
        <div className="chips" role="radiogroup" aria-label="Connect people by">
          {BASES.map((b) => (
            <label key={b.value} title={b.hint} {...explain.props(basisExplanation(b.value))}>
              <input
                type="radio"
                name={`${id}-basis`}
                checked={filters.basis === b.value}
                onChange={() => set({ basis: b.value })}
              />{' '}
              {b.label}
            </label>
          ))}
        </div>
        <span className="hint filter-hint">{FILTER_HINTS.basis}</span>
      </fieldset>

      <fieldset disabled={valuesBasis} {...explain.props(sectionsExplanation)}>
        <legend>Skill areas{valuesBasis ? ' (not used for values)' : ''}</legend>
        <div className="chips">
          {SECTIONS.map((s) => (
            <label key={s} data-section={s}>
              <input type="checkbox" checked={filters.sections.includes(s)} onChange={() => toggleSection(s)} />{' '}
              {SECTION_LABELS[s]}
            </label>
          ))}
        </div>
        <span className="hint filter-hint">{FILTER_HINTS.sections}</span>
      </fieldset>

      <label {...explain.props(adjacencyExplanation)}>
        Related terms count{' '}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.adjacency}
          aria-valuetext={filters.adjacency === 0 ? 'exact matches only' : `${Math.round(filters.adjacency * 100)}% of full strength`}
          onChange={(e) => set({ adjacency: Number(e.target.value) })}
        />{' '}
        <output>{filters.adjacency === 0 ? 'exact only' : `${Math.round(filters.adjacency * 100)}%`}</output>
        <span className="hint filter-hint">{FILTER_HINTS.adjacency}</span>
      </label>

      <label {...explain.props(thresholdExplanation)}>
        Hide weaker connections{' '}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.threshold}
          onChange={(e) => set({ threshold: Number(e.target.value) })}
        />{' '}
        <output>{`below ${Math.round(filters.threshold * 100)}%`}</output>
        <span className="hint filter-hint">{FILTER_HINTS.threshold}</span>
      </label>

      <div {...explain.props(focusExplanation)}>
        <label>
          Focus on a term{' '}
          <input
            list={`${id}-terms`}
            value={query}
            placeholder="Type a skill or value"
            onChange={(e) => addFocus(e.target.value)}
          />
        </label>
        <span className="hint filter-hint">{FILTER_HINTS.focus}</span>
        <datalist id={`${id}-terms`}>
          {index.data.terms.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>
        {filters.focus.length > 0 && (
          <ul className="chips" aria-label="Focused terms" style={{ listStyle: 'none', padding: 0 }}>
            {filters.focus.map((tid) => (
              <li key={tid} className="chip">
                {index.term.get(tid)?.name}
                <button
                  type="button"
                  aria-label={`Stop focusing on ${index.term.get(tid)?.name}`}
                  onClick={() => set({ focus: filters.focus.filter((x) => x !== tid) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  )
}
