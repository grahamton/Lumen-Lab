export function CollapsibleSection({ id, title, isOpen, isActive, onToggle, children }) {
  return (
    <div className="border-b border-neutral-800">
      <button
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? 'bg-cyan-400' : 'bg-neutral-700'}`} />
          <span className={`text-[9px] tracking-widest font-semibold transition-colors ${isActive ? 'text-neutral-200' : 'text-neutral-500'}`}>
            {title}
          </span>
        </div>
        <span className={`text-[9px] text-neutral-600 inline-block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
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
