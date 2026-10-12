import { useEffect, useState } from 'react'
import type { Api } from '../api'
import { HelpPanel } from './HelpPanel'

export type Page = 'people' | 'explore' | 'dictionary'

type Progress = { people: number; undefinedTerms: number }
type StepState = 'done' | 'current' | 'available' | 'waiting'

const STATE_TEXT: Record<StepState, string> = {
  done: 'done',
  current: 'next',
  available: 'you can start now',
  waiting: 'not yet available',
}

/** The three steps, and where the user is in them, from what is stored in the browser. */
export function stepStates({ people, undefinedTerms }: Progress): [StepState, StepState, StepState] {
  if (people < 2) return ['current', 'waiting', 'waiting']
  // Review is optional: Explore is open as soon as two people exist, whatever is still undefined.
  return undefinedTerms > 0 ? ['done', 'current', 'available'] : ['done', 'done', 'current']
}

/** Where the next step happens, and what to call the button that goes there. */
export function nextStep({ people, undefinedTerms }: Progress): { page: Page; label: string } {
  if (people < 2) return { page: 'people', label: 'Go to People to upload profiles' }
  if (undefinedTerms > 0) return { page: 'dictionary', label: 'Finish defining terms in the Dictionary' }
  return { page: 'explore', label: 'Go to Explore' }
}

/**
 * A short strip on every page: upload, review, explore, with what is done and what to do next.
 * It reads the stored data, so it moves on by itself as the user uploads and defines terms.
 */
export function GettingStarted({
  api,
  page,
  refreshKey,
  onGo,
}: {
  api: Api
  page: Page
  refreshKey: number
  onGo: (page: Page) => void
}) {
  const [progress, setProgress] = useState<Progress | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.listIndividuals(), api.listTerms({ status: 'undefined' })])
      .then(([people, undef]) => !cancelled && setProgress({ people: people.length, undefinedTerms: undef.length }))
      .catch(() => !cancelled && setProgress(null))
    return () => {
      cancelled = true
    }
  }, [api, page, refreshKey])

  if (!progress) return null
  const states = stepStates(progress)
  const next = nextStep(progress)
  const finished = progress.people >= 2 && progress.undefinedTerms === 0
  const steps = [
    { title: 'Upload profiles', text: 'Add at least two profile files exported from the profile tool, or load the samples.' },
    {
      title: 'Review new terms',
      text:
        progress.undefinedTerms > 0
          ? `${progress.undefinedTerms} term${progress.undefinedTerms === 1 ? ' has' : 's have'} no definition yet. Accept, edit or reject proposals, or define them in the Dictionary.`
          : `Confirm a definition for anything you wrote that the dictionary does not know.${progress.people >= 2 ? ' Nothing is waiting.' : ''}`,
    },
    { title: 'Explore', text: 'See how the people relate, change what counts as a connection, and look at the groups.' },
  ]

  return (
    <HelpPanel id="getting-started" title="Getting started" gestures={false}>
      <ol className="steps" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s.title} className="step" data-state={states[i]} aria-current={states[i] === 'current' ? 'step' : undefined}>
            <strong>
              {i + 1}. {s.title}
            </strong>{' '}
            <span className="step-state">({STATE_TEXT[states[i]]})</span>
            <span className="hint">{s.text}</span>
          </li>
        ))}
      </ol>
      {next.page !== page && !(finished && page === 'explore') && (
        <p>
          <button type="button" onClick={() => onGo(next.page)}>
            {next.label}
          </button>
        </p>
      )}
    </HelpPanel>
  )
}
