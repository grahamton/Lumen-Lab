import { useEffect, useRef } from 'react'

export function CollapsibleSection({ id, title, isOpen, onToggle, children }) {
  const rootRef = useRef(null)
  const wasOpen = useRef(isOpen)

  // When a section opens, bring it into view (but not on first mount).
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      rootRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }
    wasOpen.current = isOpen
  }, [isOpen])

  return (
    <div ref={rootRef} className="border-b border-neutral-800" data-help={`section.${id}`}>
      <button
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isOpen ? 'bg-cyan-400' : 'bg-neutral-700'}`} />
          <span className={`text-[11px] tracking-widest font-semibold transition-colors ${isOpen ? 'text-neutral-100' : 'text-neutral-400'}`}>
            {title}
          </span>
        </div>
        <span className={`text-[10px] text-neutral-500 inline-block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-1 bg-neutral-900/30">
          {children}
        </div>
      )}
    </div>
  )
}
