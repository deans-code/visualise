import { useSaveState } from '../storage-state'

/** Says so when what the user does here will not be kept, and why. Renders nothing while saving works. */
export function StorageNotice() {
  const state = useSaveState()
  if (state.kind === 'saved') return null
  return (
    <p role="alert" className="notice">
      {state.kind === 'memory-only' ? (
        <>
          <strong>Your data will not be saved.</strong> {state.reason} The visualiser still works, but everything you add
          is lost when you close or reload this tab.
        </>
      ) : (
        <>
          <strong>The last change was not saved.</strong> {state.reason} It is still here for this session, and saving
          will be tried again on your next change. Consider freeing browser storage.
        </>
      )}
    </p>
  )
}
