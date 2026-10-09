import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

export const LONG_PRESS_MS = 500
/** How long after a long-press ends its trailing click is still suppressed. */
export const CLICK_SUPPRESS_MS = 400
export const EXPLAIN_PANEL_ID = 'explanation-panel'

export interface Explanation {
  title: string
  /** A short line under the title, such as the kind of thing being explained. */
  kicker?: string
  body: string
  details?: string[]
}

/** Props to spread on any element (HTML or SVG) that can be explained. */
export interface ExplainProps {
  'aria-haspopup'?: 'dialog'
  onContextMenu?: (e: MouseEvent<Element>) => void
  onKeyDown?: (e: KeyboardEvent<Element>) => void
  onPointerDown?: (e: PointerEvent<Element>) => void
  onPointerUp?: () => void
  onPointerCancel?: () => void
  onPointerLeave?: () => void
  onClickCapture?: (e: MouseEvent<Element>) => void
}

interface Explainer {
  /** Handlers that open `content` on right-click, ContextMenu, Shift+F10, "?" and touch long-press. */
  props: (content: Explanation | null | undefined) => ExplainProps
  /** Stop a pending long-press, for example because the finger started dragging. */
  cancelPress: () => void
  close: () => void
}

const NONE: ExplainProps = {}
const Context = createContext<Explainer>({ props: () => NONE, cancelPress: () => {}, close: () => {} })

export const useExplain = () => useContext(Context)

/** Typing a "?" into a text box must not open an explanation. */
const isTextEntry = (el: EventTarget) =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && ['text', 'search', 'email', 'url', 'number', 'password', ''].includes(el.type))

export function ExplainProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<{ content: Explanation; anchor: Element } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const clearFlag = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(clearFlag.current)
    },
    [],
  )

  const open = useCallback((content: Explanation, anchor: Element) => setShown({ content, anchor }), [])
  const cancelPress = useCallback(() => window.clearTimeout(timer.current), [])
  const close = useCallback(() => setShown(null), [])

  const props = useCallback(
    (content: Explanation | null | undefined): ExplainProps => {
      if (!content) return NONE
      // End of a press: stop any pending long-press, and let a long-press's own trailing click be ignored
      // without leaving the flag set for a later, unrelated click.
      const endPress = () => {
        window.clearTimeout(timer.current)
        if (longPressed.current) {
          window.clearTimeout(clearFlag.current)
          clearFlag.current = window.setTimeout(() => {
            longPressed.current = false
          }, CLICK_SUPPRESS_MS)
        }
      }
      return {
        'aria-haspopup': 'dialog',
        onContextMenu: (e) => {
          e.preventDefault()
          e.stopPropagation()
          open(content, e.currentTarget)
        },
        onKeyDown: (e) => {
          if (isTextEntry(e.target)) return
          if (e.key === '?' || e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            e.preventDefault()
            e.stopPropagation()
            open(content, e.currentTarget)
          }
        },
        onPointerDown: (e) => {
          longPressed.current = false
          window.clearTimeout(clearFlag.current)
          window.clearTimeout(timer.current)
          if (e.pointerType !== 'touch') return
          const anchor = e.currentTarget
          timer.current = window.setTimeout(() => {
            longPressed.current = true
            open(content, anchor)
          }, LONG_PRESS_MS)
        },
        onPointerUp: endPress,
        onPointerCancel: endPress,
        onPointerLeave: endPress,
        onClickCapture: (e) => {
          if (!longPressed.current) return
          longPressed.current = false
          e.preventDefault()
          e.stopPropagation()
        },
      }
    },
    [open],
  )

  const value = useMemo(() => ({ props, cancelPress, close }), [props, cancelPress, close])

  return (
    <Context.Provider value={value}>
      {children}
      {shown && <ExplanationPanel content={shown.content} anchor={shown.anchor} onClose={close} />}
    </Context.Provider>
  )
}

const focusIfPossible = (el: Element) => {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.focus()
}

function ExplanationPanel({ content, anchor, onClose }: { content: Explanation; anchor: Element; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  // Below the anchor when there is room, otherwise above it, always inside the viewport.
  useLayoutEffect(() => {
    const panel = ref.current
    if (!panel) return
    const a = anchor.getBoundingClientRect()
    const { width, height } = panel.getBoundingClientRect()
    const margin = 8
    const left = Math.max(margin, Math.min(a.left, window.innerWidth - width - margin))
    const below = a.bottom + margin
    const top = below + height <= window.innerHeight ? below : Math.max(margin, a.top - height - margin)
    setPos({ top, left })
  }, [anchor, content])

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onClose()
      focusIfPossible(anchor)
    }
    const onDown = (e: globalThis.PointerEvent | globalThis.MouseEvent) => {
      if (e.target instanceof Node && !ref.current?.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [anchor, onClose])

  return (
    <div
      ref={ref}
      id={EXPLAIN_PANEL_ID}
      className="explain"
      role="dialog"
      aria-label={content.title}
      tabIndex={-1}
      style={{ top: pos.top, left: pos.left }}
      // A right-click on the panel itself must not open another one underneath.
      onContextMenu={(e) => e.stopPropagation()}
    >
      <p className="explain-title">{content.title}</p>
      {content.kicker && <p className="explain-kicker">{content.kicker}</p>}
      <p>{content.body}</p>
      {content.details && content.details.length > 0 && (
        <ul>
          {content.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="secondary"
        onClick={() => {
          onClose()
          focusIfPossible(anchor)
        }}
      >
        Close
      </button>
    </div>
  )
}
