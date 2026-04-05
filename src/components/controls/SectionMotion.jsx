import React from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { ControlGroup } from './ControlGroup'

function Toggle({ label, isOn, onToggle }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] tracking-widest text-neutral-500">{label}</span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={isOn}
        className={`w-7 h-3.5 rounded-full relative transition-colors ${isOn ? 'bg-cyan-950 border border-cyan-400' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${isOn ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

export const SectionMotion = React.memo(function SectionMotion({ onInteract }) {
  // Fine-grained selectors: subscribe to individual leaf values so this component
  // only re-renders when a specific motion value actually changes.
  const { globalPause, animationBpm, fluxEnabled, fluxAmount, setUi, setAnimation, setFlux } = useStore(
    useShallow((s) => ({
      globalPause:  s.ui.globalPause,
      animationBpm: s.animation.bpm,
      fluxEnabled:  s.flux.enabled,
      fluxAmount:   s.flux.amount,
      setUi:        s.setUi,
      setAnimation: s.setAnimation,
      setFlux:      s.setFlux,
    }))
  )
  const isPlaying = !globalPause

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <Toggle
        label="ANIMATE"
        isOn={isPlaying}
        onToggle={wrap(() => setUi('globalPause', isPlaying))}
      />
      <ControlGroup
        section="animation"
        param="speed"
        value={animationBpm}
        onChange={wrap((v) => setAnimation('bpm', v))}
      />
      <Toggle
        label="DRIFT"
        isOn={fluxEnabled}
        onToggle={wrap(() => setFlux('enabled', !fluxEnabled))}
      />
      {fluxEnabled && (
        <ControlGroup
          section="flux"
          param="amount"
          value={fluxAmount}
          onChange={wrap((v) => setFlux('amount', v))}
        />
      )}
    </div>
  )
})
