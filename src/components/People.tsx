import { useCallback, useEffect, useRef, useState } from 'react'
import type { Api, Individual, Resolution, UploadResult } from '../api'
import { personListExplanation } from '../explanations'
import { useExplain } from '../explain'
import { HelpPanel } from './HelpPanel'
import { ReviewTerms } from './ReviewTerms'

interface PendingFile {
  name: string
  text: string
}

const readText = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsText(f)
  })

export function People({ api, onChange }: { api: Api; onChange?: () => void }) {
  const [people, setPeople] = useState<Individual[]>([])
  const [result, setResult] = useState<UploadResult | null>(null)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const explain = useExplain()

  const refresh = useCallback(async () => {
    try {
      setPeople(await api.listIndividuals())
    } catch (e) {
      setError((e as Error).message)
    }
  }, [api])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const submit = async (files: PendingFile[], resolutions?: Record<string, Resolution>) => {
    setError(null)
    try {
      const res = await api.upload(files, resolutions)
      setResult(res)
      setPending(files.filter((f) => res.conflicts.some((c) => c.file === f.name)))
      await refresh()
      onChange?.()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const onFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = await Promise.all(Array.from(list).map(async (f) => ({ name: f.name, text: await readText(f) })))
    await submit(files)
    if (input.current) input.current.value = ''
  }

  const resolveAll = (resolution: Resolution) => {
    const resolutions = Object.fromEntries((result?.conflicts ?? []).map((c) => [c.file, resolution]))
    void submit(pending, resolutions)
  }

  const saveName = async (id: number) => {
    if (!draft.trim()) return
    await api.rename(id, draft)
    setEditing(null)
    await refresh()
    onChange?.()
  }

  const remove = async (p: Individual) => {
    if (!window.confirm(`Delete ${p.name} and their profile data?`)) return
    await api.remove(p.id)
    await refresh()
    onChange?.()
  }

  return (
    <section aria-labelledby="people-h">
      <h2 id="people-h">People</h2>
      <HelpPanel id="people" title="How to use People">
        <p>
          <strong>1. Upload.</strong> Choose one or more profile files exported from the profile tool. Each{' '}
          <code>.json</code> file is one person, named after the file.
        </p>
        <p>
          <strong>2. Review.</strong> Anything you wrote that is not in the built-in dictionary is offered back with a
          proposed definition for you to accept, edit or reject.
        </p>
        <p>
          <strong>3. Explore.</strong> Open the <strong>Explore</strong> tab to see how the people relate. Rename or
          delete people below.
        </p>
      </HelpPanel>
      <label>
        Upload profile JSON files
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          multiple
          onChange={(e) => void onFiles(e.target.files)}
        />
      </label>
      <p className="hint">
        Each <code>.json</code> file is one person’s exported profile, and the file name becomes their name. You can
        select several files at once.
      </p>

      {error && <p role="alert">{error}</p>}

      {result && result.imported.length > 0 && <p role="status">Imported {result.imported.length} profile(s).</p>}

      {result && result.errors.length > 0 && (
        <ul aria-label="Import errors">
          {result.errors.map((e) => (
            <li key={e.file}>
              <strong>{e.file}</strong>: {e.reason}
            </li>
          ))}
        </ul>
      )}

      {result && result.unresolved.length > 0 && (
        <ReviewTerms api={api} terms={result.unresolved} onChange={onChange} />
      )}

      {result && result.conflicts.length > 0 && (
        <div role="group" aria-label="Duplicate names">
          <p>Already uploaded: {result.conflicts.map((c) => c.name).join(', ')}</p>
          <p className="hint">
            <strong>Replace existing</strong> overwrites that person’s profile with the new file;{' '}
            <strong>Keep both</strong> adds the new file as a separate person.
          </p>
          <button onClick={() => resolveAll('replace')}>Replace existing</button>{' '}
          <button onClick={() => resolveAll('keep')}>Keep both</button>
        </div>
      )}

      {people.length === 0 ? (
        <p className="empty-state">
          No profiles uploaded yet. Use <strong>Upload profile JSON files</strong> above to add the profiles exported
          from the profile tool.
        </p>
      ) : (
        <ul aria-label="Individuals">
          {people.map((p) => (
            <li key={p.id} tabIndex={0} {...explain.props(personListExplanation(p.name, p.termCount))}>
              {editing === p.id ? (
                <>
                  <input aria-label="Display name" value={draft} onChange={(e) => setDraft(e.target.value)} />{' '}
                  <button onClick={() => void saveName(p.id)}>Save</button>{' '}
                  <button className="secondary" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span>{p.name}</span> <small>({p.termCount} terms)</small>{' '}
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditing(p.id)
                      setDraft(p.name)
                    }}
                  >
                    Rename
                  </button>{' '}
                  <button className="secondary" onClick={() => void remove(p)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
