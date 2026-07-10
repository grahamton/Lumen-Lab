import React from 'react'
import { getEffectiveAuthoredSceneState, useStore } from '../../store/useStore'
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

export const SectionColor = React.memo(function SectionColor({ onInteract }) {
  // Fine-grained selectors: subscribe to individual leaf values so this component
  // only re-renders when a specific color/effects value actually changes.
  const { colorHue, colorSat, colorLight, colorPosterize, effectsInvert, setColor, setEffect } = useStore(
    useShallow((s) => {
      const effectiveSceneState = getEffectiveAuthoredSceneState(s)
      return {
        colorHue: effectiveSceneState.color.hue,
        colorSat: effectiveSceneState.color.sat,
        colorLight: effectiveSceneState.color.light,
        colorPosterize: effectiveSceneState.color.posterize,
        effectsInvert: effectiveSceneState.effects.invert,
        setColor: s.setColor,
        setEffect: s.setEffect,
      }
    })
  )

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <ControlGroup section="color" param="hue"       value={colorHue}       onChange={wrap((v) => setColor('hue', v))} />
      <ControlGroup section="color" param="sat"       value={colorSat}       onChange={wrap((v) => setColor('sat', v))} />
      <ControlGroup section="color" param="light"     value={colorLight}     onChange={wrap((v) => setColor('light', v))} />
      <ControlGroup section="color" param="posterize" value={colorPosterize} onChange={wrap((v) => setColor('posterize', v))} />

      <Toggle
        label="INVERT"
        isOn={effectsInvert > 0}
        onToggle={wrap(() => setEffect('invert', effectsInvert > 0 ? 0 : 100))}
      />
    </div>
  )
})
