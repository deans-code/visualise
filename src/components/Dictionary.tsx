import { useCallback, useEffect, useState } from 'react'
import type { Api, Term, TermQuery } from '../api'
import { accentOf, statusExplanation, termExplanation } from '../explanations'
import { useExplain } from '../explain'
import { HelpPanel } from './HelpPanel'

export function Dictionary({ api, refreshKey = 0 }: { api: Api; refreshKey?: number }) {
  const [terms, setTerms] = useState<Term[]>([])
  const [query, setQuery] = useState<TermQuery>({})
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Term | null>(null)
  const [definition, setDefinition] = useState('')
  const [category, setCategory] = useState('')
  const explain = useExplain()

  const load = useCallback(async () => {
    try {
      setTerms(await api.listTerms(query))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [api, query])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const startEdit = (t: Term) => {
    setEditing(t)
    setDefinition(t.definition ?? '')
    setCategory(t.category ?? '')
  }

  const save = async () => {
    if (!editing) return
    await api.updateTerm(editing.id, { definition, category })
    setEditing(null)
    await load()
  }

  const remove = async (t: Term) => {
    const used = t.individuals > 0 ? ` It is used by ${t.individuals} ${t.individuals === 1 ? 'person' : 'people'}.` : ''
    if (!window.confirm(`Delete "${t.name}" from the dictionary?${used}`)) return
    await api.removeTerm(t.id)
    await load()
  }

  return (
    <section aria-labelledby="dict-h">
      <h2 id="dict-h">Dictionary</h2>
      <HelpPanel id="dictionary" title="How to use the Dictionary">
        <p>
          Every value and skill the visualiser knows, with the definition it shows when you ask what something means.
          Search by name, narrow by type, or tick <strong>Undefined only</strong> to find terms still waiting for a
          definition.
        </p>
        <p>
          Use <strong>Edit</strong> to write or correct a definition and its category. Terms are tinted by the profile
          section they belong to.
        </p>
      </HelpPanel>

      <p className="hint">Search by name, filter by type, or show only terms that still need a definition.</p>
      <div role="search">
        <label>
          Search terms{' '}
          <input type="search" value={query.q ?? ''} onChange={(e) => setQuery({ ...query, q: e.target.value })} />
        </label>{' '}
        <label>
          Type{' '}
          <select
            value={query.kind ?? ''}
            onChange={(e) => setQuery({ ...query, kind: (e.target.value || undefined) as TermQuery['kind'] })}
          >
            <option value="">All</option>
            <option value="value">Values</option>
            <option value="skill">Skills</option>
          </select>
        </label>{' '}
        <label>
          <input
            type="checkbox"
            checked={query.status === 'undefined'}
            onChange={(e) => setQuery({ ...query, status: e.target.checked ? 'undefined' : undefined })}
          />{' '}
          Undefined only
        </label>
      </div>

      {error && <p role="alert">{error}</p>}
      <p>{terms.length} terms</p>

      <ul aria-label="Terms">
        {terms.map((t) => (
          <li key={t.id} data-section={accentOf(t)} tabIndex={0} {...explain.props(termExplanation(t))}>
            <strong>{t.name}</strong>{' '}
            <small tabIndex={0} {...explain.props(t.status === 'undefined' ? statusExplanation.undefined : t.builtin ? statusExplanation.builtin : statusExplanation.custom)}>
              {t.kind}
              {t.category ? ` · ${t.category}` : ''}
              {t.builtin ? '' : ' · custom'}
              {t.status === 'undefined' ? ' · undefined' : ''}
            </small>
            <p>{t.definition ?? <em>No definition yet</em>}</p>
            {t.sourceUrl && (
              <p>
                <a href={t.sourceUrl} target="_blank" rel="noreferrer">
                  Source
                </a>
              </p>
            )}
            <button className="secondary" onClick={() => startEdit(t)} aria-label={`Edit ${t.name}`}>
              Edit
            </button>{' '}
            <button className="secondary" onClick={() => void remove(t)} aria-label={`Delete ${t.name}`}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <form
          aria-label={`Edit ${editing.name}`}
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <h3>Edit {editing.name}</h3>
          <label>
            Definition
            <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} />
          </label>
          <label>
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <button type="submit">Save</button>{' '}
          <button type="button" className="secondary" onClick={() => setEditing(null)}>
            Cancel
          </button>
        </form>
      )}
    </section>
  )
}
