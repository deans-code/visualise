import { useState, type ReactNode } from 'react'

const key = (id: string) => `visualiser.help.${id}`

// Browser storage can be missing or throw (private windows, blocked site data); the panel then just starts open.
const readCollapsed = (id: string) => {
  try {
    return sessionStorage.getItem(key(id)) === 'collapsed'
  } catch {
    return false
  }
}
const writeCollapsed = (id: string, collapsed: boolean) => {
  try {
    sessionStorage.setItem(key(id), collapsed ? 'collapsed' : 'open')
  } catch {
    /* not remembered */
  }
}

/** How to open an explanation; every page with explainable elements shows it. */
export function GestureHint() {
  return (
    <p className="help-alt">
      <strong>Mouse:</strong> <strong>right-click</strong> a term, person, connection or control to read what it means.{' '}
      <strong>Keyboard:</strong> focus it and press <kbd>?</kbd> or <kbd>Shift</kbd>+<kbd>F10</kbd>.{' '}
      <strong>Touch:</strong> press and hold.
    </p>
  )
}

/** A collapsible "how to use this page" panel; its state is remembered for the browser session. */
export function HelpPanel({
  id,
  title,
  children,
  gestures = true,
}: {
  id: string
  title: string
  children: ReactNode
  /** Whether to end with how to open explanations; the Getting started strip has no explainable elements. */
  gestures?: boolean
}) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(id))
  const toggle = () => {
    writeCollapsed(id, !collapsed)
    setCollapsed(!collapsed)
  }
  const bodyId = `help-body-${id}`
  return (
    <aside className="help" aria-label={`How to use: ${title}`}>
      <div className="help-head">
        <strong>{title}</strong>
        <button type="button" className="secondary" aria-expanded={!collapsed} aria-controls={bodyId} onClick={toggle}>
          {collapsed ? 'Show help' : 'Hide help'}
        </button>
      </div>
      <div id={bodyId} hidden={collapsed}>
        {children}
        {gestures && <GestureHint />}
      </div>
    </aside>
  )
}
