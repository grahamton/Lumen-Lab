import { useEffect, useState } from 'react'
import { HELP, IDLE_HELP } from '../../config/helpText'

// Ableton-style info view: shows the name and tip of whatever control the
// pointer or keyboard focus is on. Listens (delegated) on `rootRef`'s element.
export function InfoBar({ rootRef }) {
  const [helpId, setHelpId] = useState(null)

  useEffect(() => {
    const root = rootRef?.current
    if (!root) return undefined

    const pick = (event) => {
      const target = event.target
      const el = target instanceof Element ? target.closest('[data-help]') : null
      if (el && root.contains(el)) setHelpId(el.getAttribute('data-help'))
    }
    const clear = () => setHelpId(null)

    root.addEventListener('mouseover', pick)
    root.addEventListener('focusin', pick)
    root.addEventListener('mouseleave', clear)
    return () => {
      root.removeEventListener('mouseover', pick)
      root.removeEventListener('focusin', pick)
      root.removeEventListener('mouseleave', clear)
    }
  }, [rootRef])

  const entry = helpId ? HELP[helpId] : null

  return (
    <div
      aria-live="polite"
      data-testid="info-bar"
      className="h-14 shrink-0 px-3 py-1 border-t border-neutral-800 bg-neutral-950/80 overflow-hidden flex flex-col justify-center"
    >
      {entry ? (
        <>
          <p className="text-[10px] font-semibold tracking-widest text-cyan-400 uppercase truncate">{entry.name}</p>
          <p className="text-[11px] leading-[1.3] text-neutral-300 line-clamp-2">{entry.tip}</p>
        </>
      ) : (
        <p className="text-[11px] leading-[1.3] text-neutral-400 line-clamp-2">{IDLE_HELP}</p>
      )}
    </div>
  )
}
