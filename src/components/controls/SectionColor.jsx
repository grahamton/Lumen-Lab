import React, { useCallback } from 'react'
import { getEffectiveAuthoredSceneState, useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { ControlGroup } from './ControlGroup'
import { Toggle } from './Toggle'

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

  const toggleFlip = useCallback(() => {
    onInteract?.()
    setEffect('invert', effectsInvert > 0 ? 0 : 100)
  }, [onInteract, setEffect, effectsInvert])

  return (
    <div>
      <ControlGroup section="color" param="hue"       value={colorHue}       set={setColor} onInteract={onInteract} />
      <ControlGroup section="color" param="sat"       value={colorSat}       set={setColor} onInteract={onInteract} />
      <ControlGroup section="color" param="light"     value={colorLight}     set={setColor} onInteract={onInteract} />
      <ControlGroup section="color" param="posterize" value={colorPosterize} set={setColor} onInteract={onInteract} />

      <Toggle label="FLIP COLORS" help="effects.invert" isOn={effectsInvert > 0} onToggle={toggleFlip} />
    </div>
  )
})
