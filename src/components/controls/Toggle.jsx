import React from 'react'

// Whole row is the hit target so it is easy to hit with a mouse or a trackpad.
export const Toggle = React.memo(function Toggle({ label, isOn, onToggle, help }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      data-help={help}
      onClick={onToggle}
      className="group w-full flex items-center justify-between gap-2 min-h-8 -mx-1 px-1 mb-1 rounded hover:bg-neutral-800/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-400 transition-colors"
    >
      <span className={`text-[10px] tracking-widest transition-colors ${isOn ? 'text-neutral-200' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`w-9 h-5 shrink-0 rounded-full relative transition-colors border ${isOn ? 'bg-cyan-950 border-cyan-400' : 'bg-neutral-700 border-neutral-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-transform ${isOn ? 'translate-x-4 bg-cyan-400' : 'translate-x-0 bg-neutral-400'}`} />
      </span>
    </button>
  )
})
