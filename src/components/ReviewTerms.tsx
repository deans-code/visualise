import { useEffect, useMemo, useState } from 'react'
import type { Api, LookupOutcome, Placement, UnresolvedTerm } from '../api'

type Fetched =
  | { state: 'loading' }
  | { state: 'done'; outcome: LookupOutcome; placement: Placement | null }

type Decision = 'accepted' | 'merged' | 'rejected' | 'skipped'

const sectionLabel = (t: UnresolvedTerm) => (t.kind === 'value' ? 'value' : `skill · ${t.section ?? 'unknown'}`)

/**
 * Asks the uploader to confirm a definition for each custom term before anything is saved.
 * Lookups run one at a time to stay within the search services' rate limits.
 */
export function ReviewTerms({
  api,
  terms,
  onDone,
  onChange,
}: {
  api: Api
  terms: UnresolvedTerm[]
  onDone?: () => void
  onChange?: () => void
}) {
  const [fetched, setFetched] = useState<Record<number, Fetched>>({})
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      for (const t of terms) {
        if (cancelled) return
        setFetched((f) => ({ ...f, [t.id]: { state: 'loading' } }))
        let outcome: LookupOutcome
        try {
          outcome = await api.lookup(t.name, t.kind, t.section)
        } catch (e) {
          outcome = { proposal: null, errors: [{ provider: 'lookup', message: (e as Error).message }] }
        }
        const placement = await api.placement(t.name, t.kind, outcome.proposal?.definition ?? null).catch(() => null)
        if (cancelled) return
        setFetched((f) => ({ ...f, [t.id]: { state: 'done', outcome, placement } }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, terms])

  const decide = (id: number, d: Decision) => setDecisions((prev) => ({ ...prev, [id]: d }))
  const remaining = useMemo(() => terms.filter((t) => !decisions[t.id]), [terms, decisions])

  useEffect(() => {
    if (terms.length > 0 && remaining.length === 0) onDone?.()
  }, [terms.length, remaining.length, onDone])

  if (terms.length === 0) return null

  return (
    <section aria-labelledby="review-h">
      <h3 id="review-h">Review new terms</h3>
      <p>
        {remaining.length} of {terms.length} still to review. Nothing is saved until you accept it. Skipped or rejected
        terms stay undefined and can be completed later from the dictionary.
      </p>
      <p className="hint">
        <strong>Accept</strong> saves the definition you see; <strong>Reject</strong> discards it; <strong>Skip</strong>{' '}
        leaves the term undefined for later. If a term is just another spelling of an existing one, choose{' '}
        <strong>Yes, use…</strong> to merge them.
      </p>
      <ul aria-label="Terms to review">
        {terms.map((t) => (
          <li key={t.id}>
            {decisions[t.id] ? (
              <p>
                <strong>{t.name}</strong>: {decisions[t.id]}
              </p>
            ) : (
              <TermCard
                api={api}
                term={t}
                fetched={fetched[t.id]}
                onDecide={(d) => {
                  decide(t.id, d)
                  if (d === 'accepted' || d === 'merged') onChange?.()
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function TermCard({
  api,
  term,
  fetched,
  onDecide,
}: {
  api: Api
  term: UnresolvedTerm
  fetched: Fetched | undefined
  onDecide: (d: Decision) => void
}) {
  const ready = fetched?.state === 'done' ? fetched : null
  const proposal = ready?.outcome.proposal ?? null
  const [definition, setDefinition] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

  // Prefill once the lookup arrives, without overwriting anything the user has already typed.
  useEffect(() => {
    if (!ready || seeded) return
    setSeeded(true)
    setDefinition(ready.outcome.proposal?.definition ?? '')
    setCategory(ready.placement?.category ?? '')
  }, [ready, seeded])

  const accept = async () => {
    setError(null)
    try {
      await api.updateTerm(term.id, {
        definition: definition.trim(),
        ...(proposal ? { sourceUrl: proposal.sourceUrl } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(ready?.placement?.section ? { section: ready.placement.section } : {}),
      })
      onDecide('accepted')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const merge = async (target: { id: number; name: string }) => {
    setError(null)
    try {
      await api.addAlias(target.id, term.name)
      onDecide('merged')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <article aria-label={term.name}>
      <h4>
        {term.name} <small>{sectionLabel(term)}</small>
      </h4>

      {term.suggestions.length > 0 && (
        <div role="group" aria-label={`Possible matches for ${term.name}`}>
          {term.suggestions.map((s) => (
            <p key={s.id}>
              Is “{term.name}” the same as <strong>{s.name}</strong>?{' '}
              <button onClick={() => void merge(s)}>Yes, use {s.name}</button>
            </p>
          ))}
        </div>
      )}

      {!ready ? (
        <p role="status">{fetched ? 'Searching for a definition…' : 'Waiting to search…'}</p>
      ) : (
        <>
          {proposal ? (
            <p>
              Proposed from{' '}
              <a href={proposal.sourceUrl} target="_blank" rel="noreferrer">
                {proposal.provider}: {proposal.sourceTitle}
              </a>
              . Check it describes what you meant.
            </p>
          ) : (
            <p role="status">
              No definition found online
              {ready.outcome.errors.length > 0 ? ` (${ready.outcome.errors.map((e) => e.message).join('; ')})` : ''}.
              You can write one yourself.
            </p>
          )}
          <label>
            Definition for {term.name}
            <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3} />
          </label>
          <label>
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          {ready.placement && <small>Suggested from similar terms.</small>}
        </>
      )}

      {error && <p role="alert">{error}</p>}
      <div>
        <button onClick={() => void accept()} disabled={!ready || !definition.trim()}>
          Accept
        </button>{' '}
        <button className="secondary" onClick={() => onDecide('rejected')}>
          Reject
        </button>{' '}
        <button className="secondary" onClick={() => onDecide('skipped')}>
          Skip
        </button>
      </div>
    </article>
  )
}
