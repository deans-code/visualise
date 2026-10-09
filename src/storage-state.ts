import { useSyncExternalStore } from 'react'
import type { SaveState } from '../core/persistence'

let state: SaveState = { kind: 'saved' }
const listeners = new Set<() => void>()

/** What is happening with saving, so the page can say when data will not be kept. */
export function setSaveState(next: SaveState) {
  if (next.kind === state.kind && 'reason' in next && 'reason' in state && next.reason === state.reason) return
  if (next.kind === 'saved' && state.kind === 'saved') return
  state = next
  listeners.forEach((l) => l())
}

export const getSaveState = () => state

export function useSaveState(): SaveState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSaveState,
    getSaveState,
  )
}

/** Fired on the window when the data was replaced under the page (another tab saved a newer copy). */
export const DATA_REPLACED = 'visualiser:data-replaced'
