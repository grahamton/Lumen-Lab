import React, { useCallback } from 'react'
import { getEffectiveAuthoredSceneState, useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { ControlGroup } from './ControlGroup'
import { Toggle } from './Toggle'

export const SectionEffects = React.memo(function SectionEffects({ onInteract }) {
  const { effectsBloom, effectsCA, effectsNoise, audioEnabled, audioSensitivity, setEffect, setAudio, canvasShape, setCanvas } = useStore(
    useShallow((state) => {
      const effectiveSceneState = getEffectiveAuthoredSceneState(state)
      return {
        effectsBloom: effectiveSceneState.effects.bloom,
        effectsCA: effectiveSceneState.effects.chromaticAberration,
        effectsNoise: effectiveSceneState.effects.noise,
        audioEnabled: state.audio.enabled,
        audioSensitivity: state.audio.sensitivity,
        setEffect: state.setEffect,
        setAudio: state.setAudio,
        canvasShape: state.canvas.shape,
        setCanvas: state.setCanvas,
      }
    })
  )

  const circleCrop = canvasShape === 'circle'

  const toggleMusic = useCallback(() => {
    onInteract?.()
    setAudio('enabled', !audioEnabled)
  }, [onInteract, setAudio, audioEnabled])

  const toggleRound = useCallback(() => {
    onInteract?.()
    setCanvas('shape', circleCrop ? 'rectangle' : 'circle')
  }, [onInteract, setCanvas, circleCrop])

  return (
    <div>
      <ControlGroup section="effects" param="bloom"               value={effectsBloom} set={setEffect} onInteract={onInteract} />
      <ControlGroup section="effects" param="chromaticAberration" value={effectsCA}    set={setEffect} onInteract={onInteract} />
      <ControlGroup section="effects" param="noise"               value={effectsNoise} set={setEffect} onInteract={onInteract} />

      <Toggle label="REACT TO MUSIC" help="audio.enabled" isOn={audioEnabled} onToggle={toggleMusic} />

      {audioEnabled && (
        <ControlGroup section="audio" param="sensitivity" value={audioSensitivity} set={setAudio} onInteract={onInteract} />
      )}

      <Toggle label="ROUND FRAME" help="canvas.shape" isOn={circleCrop} onToggle={toggleRound} />
    </div>
  )
})
